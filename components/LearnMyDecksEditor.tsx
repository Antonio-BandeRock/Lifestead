// Interests > Learn, making decks (2026-10-30, Learn part 6e). Shown under
// Your Decks on the Learn lens. A deck is a name, a line about it and its
// cards; a card can be any of the eight kinds the ready-made decks use, and
// the form asks for only what its kind needs. Every decision is in
// lib/learnMyDecks.ts, checked by scripts/test_learn.js.
//
// Making and changing is part of Individual. On Free the buttons stay
// pressable and say so through explainNotYet; a deck made earlier stays
// open to study, and removing stays open, since the records are the
// person's.

import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { useTier } from '../lib/entitlement';
import { BLANK, LEARN_KINDS, type LearnKind } from '../lib/learnKinds';
import type { LearnDeck } from '../lib/learnDecks';
import {
  deckTitleProblem,
  describeRemoval,
  describeThinkingShare,
  draftProblem,
  emptyDraft,
  KIND_LABELS,
  LEARN_CARD_OWNER_KIND,
  MAKE_PAID_LINE,
  rowToDraft,
  type CardDraft,
  type MyCardRow,
} from '../lib/learnMyDecks';
import {
  addMyDeck,
  forgetPhotos,
  listMyCardRows,
  newMyCardId,
  planRemovingMyCard,
  planRemovingMyDeck,
  removeMyCard,
  removeMyDeck,
  saveImportedCards,
  saveMyCard,
  updateMyDeck,
} from '../lib/learnMyDecksDb';
import { describeImport, importTable, type ImportResult } from '../lib/learnImport';
import { isFunctionWalled } from '../lib/paidFeatures';
import { explainNotYet } from '../lib/notYet';
import { t } from '../lib/i18n';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { AppTextInput } from './AppTextInput';
import { PhotoStrip } from './PhotoStrip';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { useWalkMark } from './WalkMark';

type Props = {
  tabColor: string;
  decks: LearnDeck[];
  onChanged: () => Promise<void>;
};

type DeckForm = { id: string | null; title: string; about: string };
// A new card is handed its id before it is kept, so a photo taken in the
// form has somewhere to belong; Cancel takes the photo away again.
type CardForm = { deckId: string; cardId: string | null; newId: string; draft: CardDraft };
type ImportForm = { deckId: string; text: string; result: ImportResult | null };

const CHOICE_KINDS: LearnKind[] = ['choice', 'estimate', 'case'];

export function LearnMyDecksEditor({ tabColor, decks, onChanged }: Props) {
  const walkMark = useWalkMark();
  const tier = useTier();
  const walled = isFunctionWalled(tier, 'learnMake');
  const [deckForm, setDeckForm] = useState<DeckForm | null>(null);
  const [openDeckId, setOpenDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<MyCardRow[]>([]);
  const [cardForm, setCardForm] = useState<CardForm | null>(null);
  const [importForm, setImportForm] = useState<ImportForm | null>(null);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  function waitsForPlan(): boolean {
    if (!walled) return false;
    explainNotYet(MAKE_PAID_LINE);
    return true;
  }

  async function openDeck(deckId: string | null) {
    cancelCard();
    setImportForm(null);
    setOpenDeckId(deckId);
    setCards(deckId ? await listMyCardRows(deckId) : []);
  }

  function startDeck(deck?: LearnDeck) {
    if (waitsForPlan()) return;
    setSaidBack(null);
    setDeckForm(deck ? { id: deck.id, title: deck.title, about: deck.about } : { id: null, title: '', about: '' });
  }

  async function saveDeck() {
    if (!deckForm) return;
    const problem = deckTitleProblem(deckForm.title);
    if (problem) {
      explainNotYet(problem);
      return;
    }
    if (deckForm.id) {
      await updateMyDeck(deckForm.id, deckForm.title, deckForm.about);
      setSaidBack(t('{title}: changed.', { title: deckForm.title.trim() }));
      setDeckForm(null);
      await onChanged();
      return;
    }
    const id = await addMyDeck(deckForm.title, deckForm.about);
    setDeckForm(null);
    setSaidBack(t('{title} is made. Add its first card below.', { title: deckForm.title.trim() }));
    await onChanged();
    await openDeck(id);
  }

  function startCard(deckId: string, row?: MyCardRow) {
    if (waitsForPlan()) return;
    setSaidBack(null);
    cancelCard();
    setImportForm(null);
    setCardForm({ deckId, cardId: row?.id ?? null, newId: newMyCardId(), draft: row ? rowToDraft(row) : emptyDraft() });
  }

  function cancelCard() {
    if (cardForm && !cardForm.cardId) void forgetPhotos([cardForm.newId]);
    setCardForm(null);
  }

  function startImport(deckId: string) {
    if (waitsForPlan()) return;
    setSaidBack(null);
    cancelCard();
    setImportForm({ deckId, text: '', result: null });
  }

  function readImport(text: string) {
    if (!importForm) return;
    setImportForm({ ...importForm, text, result: text.trim() ? importTable(text) : null });
  }

  async function openImportFile() {
    let uri: string | null = null;
    try {
      const { File } = await import('expo-file-system');
      const picked = await File.pickFileAsync();
      const file = Array.isArray(picked) ? picked[0] : picked;
      if (file) uri = file.uri;
    } catch {
      // Backing out of the picker is not a problem to report.
      return;
    }
    if (!uri) return;
    try {
      const { File } = await import('expo-file-system');
      readImport(await new File(uri).text());
    } catch {
      explainNotYet('That file could not be read. Save the table as CSV, or as a text file with a tab between the sides, and open it again.');
    }
  }

  async function keepImport() {
    if (!importForm) return;
    if (!importForm.result) {
      explainNotYet('Paste a table first, or open a file that holds one.');
      return;
    }
    if (importForm.result.drafts.length === 0) {
      explainNotYet('No row of this table can become a card yet. The lines under the box say why.');
      return;
    }
    const deckId = importForm.deckId;
    const kept = await saveImportedCards(deckId, importForm.result.drafts);
    setImportForm(null);
    setSaidBack(kept === 1 ? '1 card is added to the deck.' : t('{n} cards are added to the deck.', { n: kept }));
    await onChanged();
    setCards(await listMyCardRows(deckId));
  }

  async function saveCard() {
    if (!cardForm) return;
    const problem = draftProblem(cardForm.draft);
    if (problem) {
      explainNotYet(problem);
      return;
    }
    await saveMyCard(cardForm.deckId, cardForm.draft, cardForm.cardId ?? undefined, cardForm.newId);
    setSaidBack(cardForm.cardId ? 'The card is changed. Its place in the schedule carries on.' : 'The card is kept. It comes up the next time this deck is studied.');
    const deckId = cardForm.deckId;
    setCardForm(null);
    await onChanged();
    setCards(await listMyCardRows(deckId));
  }

  async function askRemoveCard(row: MyCardRow) {
    const plan = await planRemovingMyCard(row.id);
    setConfirm({
      title: 'Remove this card?',
      message: describeRemoval('card', plan),
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            await removeMyCard(row.id);
            setSaidBack('The card is removed.');
            await onChanged();
            setCards(await listMyCardRows(row.deckId));
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  async function askRemoveDeck(deck: LearnDeck) {
    const plan = await planRemovingMyDeck(deck.id);
    setConfirm({
      title: t('Remove {title}?', { title: deck.title }),
      message: describeRemoval('deck', plan),
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            await removeMyDeck(deck.id);
            setSaidBack(t('{title}: removed.', { title: deck.title }));
            await openDeck(null);
            await onChanged();
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function setDraft(change: Partial<CardDraft>) {
    if (!cardForm) return;
    setCardForm({ ...cardForm, draft: { ...cardForm.draft, ...change } });
  }

  function renderDeckForm() {
    if (!deckForm) return null;
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <AppTextInput
          style={styles.textInput}
          value={deckForm.title}
          onChangeText={(title) => setDeckForm({ ...deckForm, title })}
          placeholder="Name of the deck: Bird calls, Spanish verbs, Knots"
        />
        <AppTextInput
          style={styles.textInput}
          value={deckForm.about}
          onChangeText={(about) => setDeckForm({ ...deckForm, about })}
          placeholder="What it is about (optional)"
          multiline
        />
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('learn.deckSave')} style={[styles.primaryButton, walkMark('learn.deckSave')]} onPress={() => void saveDeck()}>
            <Text style={styles.primaryButtonText}>{deckForm.id ? 'Save' : 'Make the Deck'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeckForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderOptions(draft: CardDraft) {
    return (
      <View style={styles.group}>
        <Text style={styles.captionText}>The options. Tap Answer beside the one that is the answer, and say for every option why it is or is not.</Text>
        {draft.options.map((option, index) => {
          const isAnswer = draft.answer === index;
          return (
            <View key={index} style={styles.optionBlock}>
              <AppTextInput
                style={styles.textInput}
                value={option.text}
                onChangeText={(text) => setDraft({ options: draft.options.map((o, i) => (i === index ? { ...o, text } : o)) })}
                placeholder={t('Option {n}', { n: index + 1 })}
              />
              <AppTextInput
                style={styles.textInput}
                value={option.why}
                onChangeText={(why) => setDraft({ options: draft.options.map((o, i) => (i === index ? { ...o, why } : o)) })}
                placeholder="Why it is or is not the answer"
                multiline
              />
              <View style={styles.links}>
                <TouchableOpacity
                  style={[styles.pill, isAnswer && styles.pillActive]}
                  onPress={() => setDraft({ answer: index })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isAnswer }}
                >
                  <Text style={[styles.pillText, isAnswer ? styles.pillTextOn : null]}>Answer</Text>
                </TouchableOpacity>
                {draft.options.length > 2 ? (
                  <TouchableOpacity
                    onPress={() =>
                      setDraft({
                        options: draft.options.filter((_, i) => i !== index),
                        answer: draft.answer === index ? 0 : draft.answer > index ? draft.answer - 1 : draft.answer,
                      })
                    }
                  >
                    <Text style={styles.linkText}>Take Out</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })}
        <TouchableOpacity onPress={() => setDraft({ options: [...draft.options, { text: '', why: '' }] })}>
          <Text style={styles.linkText}>Add an Option</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderItems(draft: CardDraft) {
    return (
      <View style={styles.group}>
        <Text style={styles.captionText}>The things to order, written first to last. They are shuffled when the card comes up.</Text>
        {draft.items.map((item, index) => (
          <AppTextInput
            key={index}
            style={styles.textInput}
            value={item}
            onChangeText={(text) => setDraft({ items: draft.items.map((it, i) => (i === index ? text : it)) })}
            placeholder={t('Number {n}', { n: index + 1 })}
          />
        ))}
        <TouchableOpacity onPress={() => setDraft({ items: [...draft.items, ''] })}>
          <Text style={styles.linkText}>Add Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderPairs(draft: CardDraft) {
    return (
      <View style={styles.group}>
        <Text style={styles.captionText}>Each pair: a tile for the left and the tile it goes with on the right.</Text>
        {draft.pairs.map((pair, index) => (
          <View key={index} style={styles.pairRow}>
            <AppTextInput
              style={[styles.textInput, styles.pairInput]}
              value={pair.left}
              onChangeText={(left) => setDraft({ pairs: draft.pairs.map((p, i) => (i === index ? { ...p, left } : p)) })}
              placeholder="Left"
            />
            <AppTextInput
              style={[styles.textInput, styles.pairInput]}
              value={pair.right}
              onChangeText={(right) => setDraft({ pairs: draft.pairs.map((p, i) => (i === index ? { ...p, right } : p)) })}
              placeholder="Right"
            />
          </View>
        ))}
        <TouchableOpacity onPress={() => setDraft({ pairs: [...draft.pairs, { left: '', right: '' }] })}>
          <Text style={styles.linkText}>Add a Pair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderCardForm() {
    if (!cardForm) return null;
    const draft = cardForm.draft;
    const kind = draft.kind;
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <Text style={styles.captionText}>What kind of card</Text>
        <PopoverSelect
          options={LEARN_KINDS.map((value) => ({ label: KIND_LABELS[value], value }))}
          selected={kind}
          onSelect={(value) => setDraft({ kind: value as LearnKind })}
          tabColor={tabColor}
          width={260}
        />
        {kind === 'case' ? (
          <AppTextInput
            style={styles.textInput}
            value={draft.story}
            onChangeText={(story) => setDraft({ story })}
            placeholder="The short case read first"
            multiline
          />
        ) : null}
        <AppTextInput
          style={styles.textInput}
          value={draft.front}
          onChangeText={(front) => setDraft({ front })}
          placeholder={kind === 'blank' ? `The question, with ${BLANK} where the gap goes` : 'The question, on the front'}
          multiline
        />
        {CHOICE_KINDS.includes(kind) ? renderOptions(draft) : null}
        {kind === 'blank' ? (
          <AppTextInput
            style={styles.textInput}
            value={draft.accept}
            onChangeText={(accept) => setDraft({ accept })}
            placeholder="What fills the gap, one answer per line"
            multiline
          />
        ) : null}
        {kind === 'order' ? renderItems(draft) : null}
        {kind === 'pairs' ? renderPairs(draft) : null}
        <View ref={walkMark.ref('learn.cardPhoto')} style={walkMark('learn.cardPhoto')}>
          <PhotoStrip
            ownerKind={LEARN_CARD_OWNER_KIND}
            ownerId={cardForm.cardId ?? cardForm.newId}
            tabColor={tabColor}
            addLabel="A Photo on the Front"
            title={draft.front.trim() || undefined}
          />
        </View>
        <AppTextInput
          style={styles.textInput}
          value={draft.back}
          onChangeText={(back) => setDraft({ back })}
          placeholder="The answer, on the back"
          multiline
        />
        <TouchableOpacity
          style={[styles.pill, draft.thinking && styles.pillActive, styles.pillSelf]}
          onPress={() => setDraft({ thinking: !draft.thinking })}
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.thinking }}
        >
          <Text style={[styles.pillText, draft.thinking ? styles.pillTextOn : null]}>Asks how to weigh something</Text>
        </TouchableOpacity>
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('learn.cardSave')} style={[styles.primaryButton, walkMark('learn.cardSave')]} onPress={() => void saveCard()}>
            <Text style={styles.primaryButtonText}>{cardForm.cardId ? 'Save' : 'Keep the Card'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={cancelCard}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderImportForm() {
    if (!importForm) return null;
    const lines = importForm.result ? describeImport(importForm.result, t) : [];
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <Text style={styles.captionText}>
          Paste a table, or open a spreadsheet saved as CSV or the text file a flashcard app exports. The first column is the front and the second the back. A third column reading yes marks a card that asks how to weigh something. A front holding {BLANK} becomes a gap to fill, with answers that fill it separated by |.
        </Text>
        <AppTextInput
          style={[styles.textInput, styles.pasteBox]}
          value={importForm.text}
          onChangeText={readImport}
          placeholder="Paste the table here"
          multiline
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void openImportFile()}>
          <Text style={styles.secondaryButtonText}>Open a File</Text>
        </TouchableOpacity>
        {lines.map((line) => (
          <Text key={line} style={styles.captionText}>
            {line}
          </Text>
        ))}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('learn.importKeep')} style={[styles.primaryButton, walkMark('learn.importKeep')]} onPress={() => void keepImport()}>
            <Text style={styles.primaryButtonText}>Add These Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setImportForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderOpenDeck(deck: LearnDeck) {
    const shareLine = describeThinkingShare(deck.cards);
    return (
      <View style={styles.group}>
        {shareLine ? <Text style={styles.captionText}>{shareLine}</Text> : null}
        {cards.map((row) =>
          cardForm?.cardId === row.id ? (
            <View key={row.id}>{renderCardForm()}</View>
          ) : (
            <View key={row.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
              <Text style={styles.bodyText}>{row.front}</Text>
              <Text style={styles.captionText}>
                {row.thinking ? t('{kind} · asks how to weigh something', { kind: KIND_LABELS[row.kind as LearnKind] ?? row.kind }) : (KIND_LABELS[row.kind as LearnKind] ?? row.kind)}
              </Text>
              <View style={styles.links}>
                <TouchableOpacity onPress={() => startCard(deck.id, row)}>
                  <Text style={styles.linkText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void askRemoveCard(row)}>
                  <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ),
        )}
        {cardForm && !cardForm.cardId ? (
          renderCardForm()
        ) : importForm ? (
          renderImportForm()
        ) : (
          <View style={styles.links}>
            <TouchableOpacity ref={walkMark.ref('learn.addCard')} style={[styles.primaryButton, walkMark('learn.addCard')]} onPress={() => startCard(deck.id)}>
              <Text style={styles.primaryButtonText}>Add a Card</Text>
            </TouchableOpacity>
            <TouchableOpacity ref={walkMark.ref('learn.import')} style={[styles.secondaryButton, walkMark('learn.import')]} onPress={() => startImport(deck.id)}>
              <Text style={styles.secondaryButtonText}>Add Cards From a Table</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.links}>
          <TouchableOpacity onPress={() => startDeck(deck)}>
            <Text style={styles.linkText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void askRemoveDeck(deck)}>
            <Text style={[styles.linkText, { color: colors.danger }]}>Remove the Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void openDeck(null)}>
            <Text style={styles.linkText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.groupHeading}>Your Decks</Text>
      <Text style={styles.captionText}>
        {walled ? MAKE_PAID_LINE : 'Make a deck on anything: a language, birds, knots, the parts of an engine. Any kind of card the ready-made decks use can go in it.'}
      </Text>
      {decks.map((deck) =>
        deckForm?.id === deck.id ? (
          <View key={deck.id}>{renderDeckForm()}</View>
        ) : (
          <View key={deck.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
            <TouchableOpacity onPress={() => void openDeck(openDeckId === deck.id ? null : deck.id)} accessibilityRole="button" accessibilityState={{ expanded: openDeckId === deck.id }}>
              <Text style={styles.bodyText}>{deck.title}</Text>
              <Text style={styles.captionText}>
                {deck.cards.length === 1 ? '1 card. Tap to change its cards.' : t('{n} cards. Tap to change its cards.', { n: deck.cards.length })}
              </Text>
            </TouchableOpacity>
            {openDeckId === deck.id ? renderOpenDeck(deck) : null}
          </View>
        ),
      )}
      {deckForm && !deckForm.id ? (
        renderDeckForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref('learn.make')} style={[styles.primaryButton, walkMark('learn.make')]} onPress={() => startDeck()}>
          <Text style={styles.primaryButtonText}>Make a Deck</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}
      <AppActionSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  group: { gap: 8 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  entryBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  optionBlock: { gap: 6 },
  pairRow: { flexDirection: 'row', gap: 8 },
  pairInput: { flex: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillSelf: { alignSelf: 'flex-start' },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  nestedForm: { gap: 8, padding: 12, borderRadius: 10, borderLeftWidth: 2, marginVertical: 4, backgroundColor: colors.surfaceMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  pasteBox: { minHeight: 120, textAlignVertical: 'top' },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
