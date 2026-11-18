// A medicine's label, as its manufacturer filed it with the FDA (A11,
// Phase 2, reshaped 2026-09-26).
//
// The person scans the barcode on the box, types the NDC printed on it, or
// searches by name, and sees the label word for word with where it came
// from, what was sent to get it, when, and which version it is. The app
// interprets nothing on it and checks it against nothing. Three rules from
// the instruction that shaped this screen, all enforced in
// lib/medicineLabel.ts and covered by scripts/test_medicine_label.js:
//
//   - a code finds only the label that lists that exact code;
//   - nothing opens until the person picks it, even when one label matched;
//   - when nothing matches, the screen says so and shows nothing in its place.
//
// Opened from a med on Life > My Meds (treatmentId, treatmentName), the
// label can be kept with that med and read offline; the kept copy changes
// only when the person replaces it after Check for a Newer Version.
//
// Opened from a rule card's Open This Label (setId, ruleId; A11b), the
// person has already picked the label, so that one set id is asked for and
// shown at once, with the sentence the rule quotes marked in its section,
// or a plain note when the current version no longer holds it word for word.
//
// Make a Rule from a Sentence (A11c) lists each open section's sentences;
// the one tapped opens Insights > My Meds with the rule builder holding it
// word for word, the label named and the med chosen. The person writes when
// it applies and decides whether to save it; the app rewords nothing.
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from '../components/AppTextInput';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from '../components/HomeSectionBand';
import { PhoneOnlyNotice } from '../components/PhoneOnlyNotice';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { isDesktopApp } from '../lib/desktop/bridge';
import {
  LABEL_FDA_CAVEAT,
  LABEL_SOURCE_NOTE,
  SAVED_COPY_NOTE,
  dailyMedUrl,
  labelCaption,
  labelIdentity,
  labelName,
  labelSentences,
  markSentence,
  readableDate,
  notADrugCodeMessage,
  codeKey,
  retailCodeOf,
  rememberedMedMessage,
  OPEN_FACTS_CAVEAT,
  openFactsNotFoundMessage,
  openFactsUnreachableMessage,
  type CodeReading,
  notFoundMessage,
  pickPrompt,
  readScannedCode,
  readTypedCode,
  retrievalStatement,
  unreachableMessage,
  versionCheckMessage,
  type LabelDocument,
  type LookupAsk,
} from '../lib/medicineLabel';
import { findMedKeepingLabel, getSavedLabel, removeSavedLabel, saveLabel, type SavedLabel } from '../lib/medicineLabelDb';
import { lookUpLabel } from '../lib/medicineLabelLookup';
import { explainNotYet } from '../lib/notYet';
import { t } from '../lib/i18n';
import { leaveLabelRuleDraft } from '../lib/labelRuleDraft';
import { labelSentenceForRule } from '../lib/ruleLabelSentences';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { PopoverSelect } from '../components/PopoverSelect';
import { listAllActiveTreatments } from '../lib/db';
import { findMedByCode, rememberMedCode } from '../lib/medBarcodesDb';
import {
  labelTextFromProduct,
  lookUpMedicineProduct,
  productBasisNote,
  productRetrievalStatement,
  type MedicineProduct,
} from '../lib/medicineProduct';
import { leaveSupplementDraft } from '../lib/supplementDraft';
import { useCategoryClosed } from '../lib/vaultSession';

const TAB = colors.tabLife;

// What the person is reading: a label they picked from a lookup, or the
// copy kept with a med.
type Shown = {
  document: LabelDocument;
  sent: string;
  retrievedAt: string;
  howFound: 'code' | 'name';
  isSavedCopy: boolean;
};

// The last lookup: labels to pick from, or one sentence and nothing else.
type Found = { ask: LookupAsk; labels: LabelDocument[]; total: number; sent: string; retrievedAt: string };

export default function MedicineLabelScreen() {
  const scrollPadding = useFloatingButtonScrollPadding();
  const router = useRouter();
  const params = useLocalSearchParams<{ treatmentId?: string; treatmentName?: string; setId?: string; ruleId?: string }>();
  const treatmentId = typeof params.treatmentId === 'string' && params.treatmentId ? params.treatmentId : null;
  const treatmentName = typeof params.treatmentName === 'string' ? params.treatmentName : '';
  const askedSetId = typeof params.setId === 'string' && params.setId ? params.setId : null;
  const quote = typeof params.ruleId === 'string' && params.ruleId ? labelSentenceForRule(params.ruleId) : null;
  // The med a label opened from a rule card is kept with, if any.
  const [keptBy, setKeptBy] = useState<{ treatmentId: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);

  const [mode, setMode] = useState<'find' | 'scan'>('find');
  const [codeText, setCodeText] = useState('');
  // Filled from the med, never searched on its own: the person presses Search.
  const [nameText, setNameText] = useState(treatmentName);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Where the answer is drawn: under the button that asked. A scan's answer
  // sat below the code and name boxes, at the foot of the screen, out of
  // sight (Tony, 2026-11-18: a Mexican supplement's barcode).
  const [askedFrom, setAskedFrom] = useState<'scan' | 'typed'>('typed');
  // A retail barcode from outside the U.S. drug system, looked up in the
  // Open Facts databases, and the bottle code a med is kept with.
  const [asking, setAsking] = useState('openFDA');
  const [product, setProduct] = useState<{ item: MedicineProduct; retrievedAt: string } | null>(null);
  const [askedCode, setAskedCode] = useState<string | null>(null);
  const [bottleOf, setBottleOf] = useState<{ treatmentId: string; name: string } | null>(null);
  const [meds, setMeds] = useState<{ label: string; value: string }[]>([]);
  const [medForCode, setMedForCode] = useState<string | null>(null);
  const [codeNote, setCodeNote] = useState<string | null>(null);
  const medsClosed = useCategoryClosed('medications');
  const [shown, setShown] = useState<Shown | null>(null);
  const [saved, setSaved] = useState<SavedLabel | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [newer, setNewer] = useState<{ document: LabelDocument; retrievedAt: string } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set(['boxed_warning']));

  const [permission, requestPermission] = useCameraPermissions();
  const handledScan = useRef(false);

  useEffect(() => {
    if (!treatmentId) return;
    let cancelled = false;
    getSavedLabel(treatmentId)
      .then((label) => {
        if (cancelled || !label) return;
        setSaved(label);
        setShown({
          document: label.document,
          sent: label.whatWasSent,
          retrievedAt: label.retrievedAt,
          howFound: label.howFound,
          isSavedCopy: true,
        });
      })
      .catch((error) => console.error('[MedicineLabel] Failed to read the kept label', error));
    return () => {
      cancelled = true;
    };
  }, [treatmentId]);

  // Opened from a rule card: the person picked this exact label, so it is
  // asked for by its set id and shown at once, the quoted section open.
  const quotedSection = quote?.sectionKey ?? null;
  useEffect(() => {
    if (!askedSetId) return;
    let cancelled = false;
    setBusy(true);
    lookUpLabel({ kind: 'setId', setId: askedSetId })
      .then((outcome) => {
        if (cancelled) return;
        if (outcome.kind === 'unreachable') setMessage(unreachableMessage(outcome.status));
        else if (outcome.kind === 'not_found') setMessage(notFoundMessage({ kind: 'setId', setId: askedSetId }));
        else {
          setOpen(new Set(quotedSection ? ['boxed_warning', quotedSection] : ['boxed_warning']));
          setShown({
            document: outcome.labels[0],
            sent: outcome.sent,
            retrievedAt: outcome.retrievedAt,
            howFound: 'code',
            isSavedCopy: false,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(unreachableMessage(null));
        console.error('[MedicineLabel] Failed to look up the label by set id', error);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    findMedKeepingLabel(askedSetId)
      .then((med) => {
        if (!cancelled) setKeptBy(med);
      })
      .catch((error) => console.error('[MedicineLabel] Failed to read which med keeps this label', error));
    return () => {
      cancelled = true;
    };
  }, [askedSetId, quotedSection]);

  // A sentence picked for a rule: the builder on Insights > My Meds opens
  // with it word for word, the label named and the med chosen.
  function startRuleFrom(sentence: string, doc: LabelDocument) {
    const med = treatmentId ? { treatmentId, name: treatmentName } : keptBy;
    leaveLabelRuleDraft({
      sentence,
      setId: doc.setId,
      version: doc.version,
      date: doc.effective,
      labelName: labelName(doc),
      treatmentId: med?.treatmentId ?? null,
      treatmentName: med?.name ?? null,
    });
    setPicking(false);
    router.navigate({ pathname: '/insights', params: { openInsightsLens: 'myMeds' } });
  }

  useEffect(() => {
    if (mode === 'scan' && permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [mode, permission, requestPermission]);

  const runLookup = useCallback(async (ask: LookupAsk) => {
    setBusy(true);
    setFound(null);
    setMessage(null);
    setShown(null);
    try {
      const outcome = await lookUpLabel(ask);
      if (outcome.kind === 'unreachable') setMessage(unreachableMessage(outcome.status));
      else if (outcome.kind === 'not_found') setMessage(notFoundMessage(ask));
      else setFound({ ask, labels: outcome.labels, total: outcome.total, sent: outcome.sent, retrievedAt: outcome.retrievedAt });
    } finally {
      setBusy(false);
    }
  }, []);

  // A code that is not a U.S. drug code: a retail barcode is asked of the
  // Open Facts databases; anything else gets the sentence saying what it is.
  const runProductLookup = useCallback(async (reading: Exclude<CodeReading, { kind: 'ndc' }>) => {
    setFound(null);
    setShown(null);
    setMessage(null);
    setProduct(null);
    const retail = retailCodeOf(reading);
    if (!retail) {
      setMessage(notADrugCodeMessage(reading));
      return;
    }
    setAsking('Open Food Facts');
    setBusy(true);
    try {
      const item = await lookUpMedicineProduct(retail);
      if (item) setProduct({ item, retrievedAt: new Date().toISOString() });
      else setMessage(openFactsNotFoundMessage(reading, retail));
    } catch {
      setMessage(openFactsUnreachableMessage());
    } finally {
      setBusy(false);
      setAsking('openFDA');
    }
  }, []);

  // Every code asked about: is it a bottle already kept with a med? Not
  // read while the vault holds meds closed, so a scan never names one.
  const askAboutCode = useCallback(
    (reading: CodeReading) => {
      const key = codeKey(reading);
      setAskedCode(key);
      setBottleOf(null);
      setCodeNote(null);
      setProduct(null);
      if (key && !medsClosed) findMedByCode(key).then(setBottleOf).catch(() => setBottleOf(null));
      if (reading.kind === 'ndc') runLookup({ kind: 'code', reading });
      else runProductLookup(reading);
    },
    [medsClosed, runLookup, runProductLookup],
  );

  function lookUpCode() {
    if (!codeText.trim()) return explainNotYet('Type the code from the box or the pharmacy label first.');
    setAskedFrom('typed');
    askAboutCode(readTypedCode(codeText));
  }

  function searchName() {
    if (!nameText.trim()) return explainNotYet("Type the medicine's brand or generic name first.");
    setAskedFrom('typed');
    setAskedCode(null);
    setBottleOf(null);
    setProduct(null);
    runLookup({ kind: 'name', name: nameText });
  }

  // Meds to tie a bottle to, read when a code has been asked about and the
  // screen was not opened from one med.
  useEffect(() => {
    if (!askedCode || treatmentId || medsClosed) return;
    listAllActiveTreatments()
      .then((rows) => setMeds(rows.map((r) => ({ label: r.name, value: r.id })).sort((a, b) => a.label.localeCompare(b.label))))
      .catch(() => setMeds([]));
  }, [askedCode, treatmentId, medsClosed]);

  async function rememberBottle() {
    if (!askedCode) return;
    const id = treatmentId ?? medForCode;
    if (!id) return explainNotYet('Pick which of your meds this bottle is first.');
    const name = treatmentId ? treatmentName : (meds.find((m) => m.value === id)?.label ?? '');
    await rememberMedCode(askedCode, id);
    setBottleOf({ treatmentId: id, name });
    setCodeNote(t('Kept. Scanning this bottle again names {name}.', { name }));
  }

  function startSupplement() {
    if (!product) return;
    leaveSupplementDraft({
      name: product.item.brand ? `${product.item.name} (${product.item.brand})` : product.item.name,
      labelText: labelTextFromProduct(product.item),
      code: askedCode,
    });
    router.navigate({ pathname: '/life', params: { openLifeLens: 'myMeds' } });
  }

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      if (handledScan.current) return;
      handledScan.current = true;
      setMode('find');
      setAskedFrom('scan');
      const reading = readScannedCode(result.data);
      if (reading.kind === 'ndc' || retailCodeOf(reading)) setCodeText(reading.shown);
      askAboutCode(reading);
    },
    [askAboutCode],
  );

  function startScanning() {
    handledScan.current = false;
    setMode('scan');
  }

  function pick(document: LabelDocument) {
    if (!found) return;
    setOpen(new Set(['boxed_warning']));
    setShown({
      document,
      sent: found.sent,
      retrievedAt: found.retrievedAt,
      howFound: found.ask.kind === 'name' ? 'name' : 'code',
      isSavedCopy: false,
    });
  }

  async function keep() {
    if (!treatmentId || !shown) return;
    const label: SavedLabel = {
      treatmentId,
      document: shown.document,
      howFound: shown.howFound,
      whatWasSent: shown.sent,
      retrievedAt: shown.retrievedAt,
    };
    await saveLabel(label);
    setSaved(label);
    setShown({ ...shown, isSavedCopy: true });
    setSavedNote(`Kept with ${treatmentName || 'this med'}. It reads the same without a connection.`);
  }

  async function checkNewer() {
    if (!saved) return;
    setBusy(true);
    setNewer(null);
    try {
      const outcome = await lookUpLabel({ kind: 'setId', setId: saved.document.setId });
      if (outcome.kind === 'unreachable') setSavedNote(unreachableMessage(outcome.status));
      else if (outcome.kind === 'not_found') setSavedNote(notFoundMessage({ kind: 'setId', setId: saved.document.setId }));
      else {
        const current = outcome.labels[0];
        setSavedNote(versionCheckMessage(saved.document, current));
        if (current.version !== saved.document.version) setNewer({ document: current, retrievedAt: outcome.retrievedAt });
      }
    } finally {
      setBusy(false);
    }
  }

  async function replaceWithNewer() {
    if (!saved || !treatmentId || !newer) return;
    const label: SavedLabel = { ...saved, document: newer.document, retrievedAt: newer.retrievedAt };
    await saveLabel(label);
    setSaved(label);
    setNewer(null);
    setShown({ document: label.document, sent: label.whatWasSent, retrievedAt: label.retrievedAt, howFound: label.howFound, isSavedCopy: true });
    setSavedNote(`Replaced with version ${newer.document.version}.`);
  }

  async function removeKept() {
    if (!treatmentId) return;
    await removeSavedLabel(treatmentId);
    setSaved(null);
    setShown(null);
    setSavedNote(null);
    setNewer(null);
  }

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (mode === 'scan') {
    if (isDesktopApp()) {
      return (
        <View style={styles.screen}>
          <View style={styles.content}>
            <PhoneOnlyNotice feature="scanMedicineCode" color={TAB} action={{ label: 'Type the Code Instead', onPress: () => setMode('find') }} />
          </View>
        </View>
      );
    }
    if (!permission) {
      return (
        <View style={styles.screen}>
          <View style={styles.centerBody}>
            <View style={styles.card}>
              <Text style={styles.text}>Getting the camera ready…</Text>
            </View>
          </View>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={styles.screen}>
          <View style={styles.centerBody}>
            <View style={styles.card}>
              <Ionicons name="camera-outline" size={40} color={colors.textMuted} style={styles.centerIcon} />
              <Text style={styles.title}>Camera access needed</Text>
              <Text style={styles.text}>
                The camera reads the barcode on the medicine box. The picture is never kept; only the code it reads is used.
              </Text>
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Allow Camera Access</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => setMode('find')}>
                <Text style={styles.secondaryButtonText}>Type the Code Instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.screen}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['datamatrix', 'upc_a', 'ean13'] }}
          onBarcodeScanned={handleScan}
        />
        <View style={styles.scanOverlay} pointerEvents="none">
          <View style={styles.scanFrame} />
        </View>
        <View style={styles.scanFooter}>
          <Text style={styles.scanHint}>
            Point this at the barcode on the medicine box, or the small square code on a prescription package. It reads on its own.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => setMode('find')}>
            <Text style={styles.secondaryButtonText}>Type the Code Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (shown) {
    const doc = shown.document;
    // The sentence a rule card quotes, marked when this label still holds it.
    const ruleQuote = quote && quote.setId === doc.setId ? quote : null;
    const quotedText = ruleQuote ? doc.sections.find((section) => section.key === ruleQuote.sectionKey)?.text : undefined;
    const mark = ruleQuote && quotedText ? markSentence(quotedText, ruleQuote.sentence) : null;
    const quotedHeading = ruleQuote ? (doc.sections.find((section) => section.key === ruleQuote.sectionKey)?.heading ?? ruleQuote.sectionKey) : '';
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
        <View style={styles.card}>
          <Text style={styles.title}>{labelName(doc)}</Text>
          <Text style={styles.caption}>{labelCaption(doc)}</Text>
          <Text style={styles.body}>{labelIdentity(doc)}</Text>
          <Text style={styles.body}>{retrievalStatement(shown.sent, shown.retrievedAt)}</Text>
          {shown.isSavedCopy ? <Text style={styles.body}>{SAVED_COPY_NOTE}</Text> : null}
          <Text style={styles.strong}>{LABEL_SOURCE_NOTE}</Text>
          <Text style={styles.caption}>{LABEL_FDA_CAVEAT}</Text>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => Linking.openURL(dailyMedUrl(doc.setId))}>
            <Ionicons name="open-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Open This Label on DailyMed</Text>
          </TouchableOpacity>
        </View>

        {ruleQuote ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              {mark
                ? t('The sentence the rule quotes is marked below, under "{section}".', { section: quotedHeading })
                : ruleQuote.version !== doc.version
                  ? t('The rule quotes version {quoted}, dated {date}. This is version {current}, which no longer holds that sentence word for word, so nothing is marked.', {
                      quoted: ruleQuote.version,
                      date: readableDate(ruleQuote.effective),
                      current: doc.version,
                    })
                  : t('This label does not hold the sentence the rule quotes word for word, so nothing is marked.')}
            </Text>
            {mark ? null : (
              <Text style={styles.labelText} selectable>
                {`“${ruleQuote.sentence}”`}
              </Text>
            )}
          </View>
        ) : null}

        {doc.sections.length > 0 ? (
          picking ? (
            <View style={styles.card}>
              <Text style={styles.body}>
                Tap the sentence to start your rule with. It goes into a new rule on Insights, My Meds, word for word, with this label named. You add when it applies to you and decide whether to save it. Open a section to see its sentences.
              </Text>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => setPicking(false)}>
                <Text style={styles.secondaryButtonText}>Stop Picking a Sentence</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.inset, styles.secondaryButton]} activeOpacity={0.85} onPress={() => setPicking(true)}>
              <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>Make a Rule from a Sentence</Text>
            </TouchableOpacity>
          )
        ) : null}

        {savedNote ? (
          <View style={styles.card}>
            <Text style={styles.body}>{savedNote}</Text>
            {newer ? (
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={replaceWithNewer}>
                <Text style={styles.primaryButtonText}>Replace with Version {newer.document.version}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {doc.sections.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              This label carries none of the warning, interaction or patient sections this screen shows. DailyMed shows every part of it.
            </Text>
          </View>
        ) : (
          doc.sections.map((section) => {
            const isOpen = open.has(section.key);
            const boxed = section.key === 'boxed_warning';
            return (
              <View key={section.key} style={[styles.card, boxed ? styles.boxedCard : null]}>
                <TouchableOpacity style={styles.foldRow} activeOpacity={0.8} onPress={() => toggle(section.key)} accessibilityRole="button">
                  <Text style={[styles.sectionHeading, boxed ? styles.boxedHeading : null]}>{section.heading}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {isOpen && picking ? (
                  labelSentences(section.text).map((sentence, index) => (
                    <TouchableOpacity
                      key={`${section.key}_${index}`}
                      style={styles.sentenceRow}
                      activeOpacity={0.8}
                      onPress={() => startRuleFrom(sentence, doc)}
                      accessibilityRole="button"
                      accessibilityHint="Starts a rule with this sentence"
                    >
                      <Text style={styles.labelText}>{sentence}</Text>
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  ))
                ) : isOpen && mark && ruleQuote?.sectionKey === section.key ? (
                  <Text style={styles.labelText} selectable>
                    {mark.before}
                    <Text style={styles.markedText}>{mark.sentence}</Text>
                    {mark.after}
                  </Text>
                ) : isOpen ? (
                  <Text style={styles.labelText} selectable>
                    {section.text}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}

        {treatmentId && !shown.isSavedCopy ? (
          <TouchableOpacity style={[styles.inset, styles.primaryButton]} activeOpacity={0.85} onPress={keep}>
            <Ionicons name="bookmark-outline" size={18} color={colors.textOnButton} />
            <Text style={styles.primaryButtonText}>Keep This Label with {treatmentName || 'This Med'}</Text>
          </TouchableOpacity>
        ) : null}
        {shown.isSavedCopy ? (
          <TouchableOpacity style={[styles.inset, styles.secondaryButton]} activeOpacity={0.85} disabled={busy} onPress={checkNewer}>
            <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>{busy ? 'Asking openFDA…' : 'Check for a Newer Version'}</Text>
          </TouchableOpacity>
        ) : null}
        {found ? (
          <TouchableOpacity style={[styles.inset, styles.secondaryButton]} activeOpacity={0.85} onPress={() => setShown(null)}>
            <Text style={styles.secondaryButtonText}>Back to the List</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.inset, styles.secondaryButton]}
          activeOpacity={0.85}
          onPress={() => {
            setShown(null);
            setFound(null);
            setMessage(null);
            setSavedNote(null);
          }}
        >
          <Text style={styles.secondaryButtonText}>Look Up a Different Label</Text>
        </TouchableOpacity>
        {shown.isSavedCopy && treatmentId ? (
          <TouchableOpacity style={[styles.inset, styles.secondaryButton]} activeOpacity={0.85} onPress={removeKept}>
            <Text style={styles.secondaryButtonText}>Remove the Kept Label</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  }

  // The answer to a lookup: drawn under whichever button asked for it.
  const answer = (
    <>
      {busy ? (
        <View style={styles.card}>
          <Text style={styles.body}>{t('Asking {source}…', { source: asking })}</Text>
        </View>
      ) : null}

      {bottleOf && !medsClosed ? (
        <View style={styles.card}>
          <Text style={styles.strong}>{rememberedMedMessage(bottleOf.name)}</Text>
          {codeNote ? <Text style={styles.caption}>{codeNote}</Text> : null}
        </View>
      ) : null}

      {message ? (
        <View style={styles.card}>
          <Text style={styles.body}>{message}</Text>
        </View>
      ) : null}

      {found ? (
        <View style={styles.card}>
          <Text style={styles.body}>{pickPrompt(found.ask, found.labels.length, found.total)}</Text>
          <Text style={styles.caption}>{retrievalStatement(found.sent, found.retrievedAt)}</Text>
          {found.labels.map((doc) => (
            <TouchableOpacity key={doc.setId} style={styles.pickRow} activeOpacity={0.8} onPress={() => pick(doc)}>
              <View style={styles.pickText}>
                <Text style={styles.pickName}>{labelName(doc)}</Text>
                <Text style={styles.caption}>{labelCaption(doc)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {product ? (
        <View style={styles.card}>
          <Text style={styles.title}>{product.item.name}</Text>
          {product.item.brand ? <Text style={styles.caption}>{t('Brand: {brand}', { brand: product.item.brand })}</Text> : null}
          {product.item.amounts.length ? (
            <>
              <Text style={styles.label}>{productBasisNote(product.item)}</Text>
              {product.item.amounts.map((a) => (
                <View key={a.key} style={styles.amountRow}>
                  <Text style={styles.pickName}>{a.label}</Text>
                  <Text style={styles.strong}>{a.shown}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.body}>No amounts were typed in for it.</Text>
          )}
          {product.item.ingredients ? (
            <>
              <Text style={styles.label}>Ingredients</Text>
              <Text style={styles.body}>{product.item.ingredients}</Text>
            </>
          ) : null}
          <Text style={styles.caption}>{OPEN_FACTS_CAVEAT}</Text>
          <Text style={styles.caption}>{productRetrievalStatement(product.item, product.retrievedAt)}</Text>
          {!treatmentId && !bottleOf ? (
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={startSupplement}>
              <Text style={styles.secondaryButtonText}>Start a Supplement From This</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {askedCode && !busy && !bottleOf && !medsClosed && (treatmentId || meds.length > 0) ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            {treatmentId
              ? t('Keep this code with {name}, and scanning this bottle again names it.', { name: treatmentName || t('this med') })
              : 'Keep this code with one of your meds, and scanning this bottle again names it.'}
          </Text>
          {treatmentId ? null : (
            <PopoverSelect
              options={meds}
              selected={medForCode}
              onSelect={setMedForCode}
              tabColor={TAB}
              placeholder={t('Which of my meds it is')}
              searchable={meds.length > 8}
            />
          )}
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={rememberBottle}>
            <Text style={styles.secondaryButtonText}>Remember This Bottle</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
      <View style={styles.card}>
        <Text style={styles.title}>{treatmentName ? `The label for ${treatmentName}` : 'Look up a medicine label'}</Text>
        <Text style={styles.body}>
          Scan the barcode on the box, type the code printed on it (the NDC, 10 or 11 digits), or search by name. The code or
          the name is sent to openFDA, the U.S. Food and Drug Administration&apos;s public data service, and nothing else is. A
          barcode from a bottle bought outside the United States is sent to Open Food Facts instead.
        </Text>
        <Text style={styles.caption}>{LABEL_SOURCE_NOTE}</Text>
        {saved ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => setShown({ document: saved.document, sent: saved.whatWasSent, retrievedAt: saved.retrievedAt, howFound: saved.howFound, isSavedCopy: true })}
          >
            <Text style={styles.secondaryButtonText}>Back to the Kept Label</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={[styles.inset, styles.primaryButton]} activeOpacity={0.85} onPress={startScanning}>
        <Ionicons name="barcode-outline" size={18} color={colors.textOnButton} />
        <Text style={styles.primaryButtonText}>Scan the Barcode</Text>
      </TouchableOpacity>

      {askedFrom === 'scan' ? answer : null}

      <View style={styles.card}>
        <Text style={styles.label}>Code from the box or pharmacy label</Text>
        <AppTextInput
          style={styles.input}
          placeholder="e.g. 0074-4341-13"
          value={codeText}
          onChangeText={setCodeText}
          onSubmitEditing={lookUpCode}
        />
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} disabled={busy} onPress={lookUpCode}>
          <Text style={styles.secondaryButtonText}>Look Up This Code</Text>
        </TouchableOpacity>
        <Text style={styles.label}>Or the medicine&apos;s name</Text>
        <AppTextInput
          style={styles.input}
          placeholder="brand or generic name"
          value={nameText}
          onChangeText={setNameText}
          onSubmitEditing={searchName}
        />
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} disabled={busy} onPress={searchName}>
          <Text style={styles.secondaryButtonText}>Search by Name</Text>
        </TouchableOpacity>
      </View>

      {askedFrom === 'typed' ? answer : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP },
  centerBody: { flex: 1, justifyContent: 'center' },
  centerIcon: { alignSelf: 'center' },
  card: { ...homeBandStyle, borderColor: TAB, padding: HOME_BAND_CONTENT_PADDING, gap: 10 },
  boxedCard: { borderColor: colors.danger },
  title: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textSecondary, ...textShadow },
  strong: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  text: { ...typography.body, color: colors.textSecondary, textAlign: 'center', ...textShadow },
  label: { ...typography.label, color: colors.textPrimary, ...textShadow },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  foldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionHeading: { ...typography.label, color: colors.textPrimary, flex: 1, ...textShadow },
  boxedHeading: { color: colors.danger },
  labelText: { ...typography.body, color: colors.textPrimary, flexShrink: 1, ...textShadow },
  markedText: { fontWeight: '700', textDecorationLine: 'underline', textDecorationColor: colors.primary },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickText: { flex: 1, gap: 2 },
  pickName: { ...typography.body, color: colors.textPrimary, ...textShadow },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  primaryButton: {
    ...BUTTON_PRIMARY,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: {
    ...BUTTON_SECONDARY,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  inset: { marginHorizontal: HOME_BAND_CONTENT_PADDING },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 260, height: 180, borderWidth: 2, borderColor: colors.accent, borderRadius: 16 },
  scanFooter: { padding: 20, gap: 10, backgroundColor: colors.background },
  scanHint: { ...typography.body, color: colors.textSecondary, textAlign: 'center', ...textShadow },
});
