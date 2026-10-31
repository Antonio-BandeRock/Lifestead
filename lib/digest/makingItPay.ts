import type { DigestEntry } from './types';

// Making It Pay, the reading lens on Interests (2026-10-30, Interests stage
// 5d). Direct instruction: self-employment reading plus the Could This Pay?
// worksheet on Money, and never advice to start a business, quit a job or
// give up on an idea. So every entry here states what the figures show,
// names who they cover and what they leave out, and stops there. No tax or
// legal advice: the tax entries say what the rate is and where it is
// published, then send the person to the office or an accountant for how it
// applies to them.
//
// Every figure was checked against its primary source before being written
// in, and carries its year in the text, since rates and thresholds change
// every January (or April in the UK). Five topics, in reading order: the
// picture with data, working out whether it could pay, the overhead any
// business carries, health and neurodivergence, and what people who decide
// to try tend to set up first. Topic grouping is classifyMakingItPayTopic in
// lib/digest/categoryGrouping.ts, keyed on the id prefix.
//
// scripts/test_making_it_pay.js sweeps every string here for advice and
// cheerleading words, and checks each entry has a year and a source.

export const MAKING_IT_PAY_ENTRIES: DigestEntry[] = [
  // --- The picture, with data ------------------------------------------------------
  {
    id: 'pay-picture-business-survival',
    category: 'makingItPay',
    title: 'About half of new US businesses with employees are still open five years later',
    teaser: 'Of the US business locations opened in March 2014, about 4 in 5 were open a year later, about half after five years and about a third after ten.',
    summary:
      'The US Bureau of Labor Statistics follows every private business location that opens with at least one employee. Of those opened in March 2014, 79.7% were still operating a year later, 50.8% after five years and 34.9% after ten. The pattern has held for decades: of the locations opened in March 2025, 78.9% reached their first year. These figures count closures for every reason, including an owner who sold up, retired or moved on to something else, so a closure is not the same as a business that failed. They also leave out the one-person business with no employees, which is how most selling from a hobby starts, and there is no comparable national count for those.',
    citations: [
      { source: 'US Bureau of Labor Statistics, Business Employment Dynamics, survival of private sector establishments by opening year (data through March 2026)', url: 'https://www.bls.gov/bdm/us_age_naics_00_table7.txt' },
      { source: 'US Bureau of Labor Statistics, The Economics Daily, January 2024: 34.7% of establishments born in 2013 still operating in 2023', url: 'https://www.bls.gov/opub/ted/2024/34-7-percent-of-business-establishments-born-in-2013-were-still-operating-in-2023.htm' },
    ],
    overallTier: 'strong',
    relatedIds: ['pay-could-cushion'],
  },
  {
    id: 'pay-picture-income-swings',
    category: 'makingItPay',
    title: 'Most self-employed US adults say their income changes from month to month',
    teaser: 'In the Federal Reserve survey of 2024, 59% of self-employed adults said their income varied month to month, against 29% of all adults.',
    summary:
      "The Federal Reserve asks US adults every year about their finances. In the survey covering 2024, 59% of self-employed adults said their income varied from month to month, compared with 29% of adults overall. Among people doing gig work, 41% had income that varied at least occasionally, against 26% of everyone else. Varying income was a problem for some: 11% of all adults said they had struggled to pay their bills at some point because of it, rising to 19% of adults with incomes under $25,000. The same survey found that gig workers most often named flexibility (55%) and work-life balance (35%) as what the work gave them. The figures are what people reported about themselves, and they describe the US only.",
    citations: [
      { source: 'Federal Reserve, Economic Well-Being of U.S. Households in 2024 (May 2025), Income and Expenses', url: 'https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-income-and-expenses.htm' },
      { source: 'Federal Reserve, Economic Well-Being of U.S. Households in 2024 (May 2025), Executive Summary', url: 'https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-executive-summary.htm' },
    ],
    overallTier: 'moderate',
    relatedIds: ['pay-could-cushion'],
  },
  {
    id: 'pay-picture-side-income',
    category: 'makingItPay',
    title: 'Selling what you make is usually part of a household income, not the whole of it',
    teaser: 'In a 2019 survey of Etsy sellers, 30% said their shop was their only occupation, and for the rest it brought in 15% of household income on average.',
    summary:
      "Two older sources point the same way. Etsy's 2019 census of its sellers worldwide found that about 80% of shops were one-person businesses and 97% were run from home. For 30% of sellers the shop was their only occupation; for the other 70% it brought in, on average, 15% of household income. That is the company surveying the people who sell through it, so it reads as a picture of one marketplace rather than of everyone who sells. Bank account data from the JPMorgan Chase Institute for the year to September 2015 found the same pattern on online platforms in general: income from labour platforms made up 14% of participants' total income on average, and 26% for those who had been at it longer. Newer figures from both exist only in secondary reports, so these are given with their years.",
    citations: [
      { source: 'Etsy, Global Seller Census, April 2019', url: 'https://extfiles.etsy.com/advocacy/Etsy_GlobalSellerCensus_4.2019.pdf' },
      { source: 'JPMorgan Chase Institute, Paychecks, Paydays, and the Online Platform Economy (2016), earnings findings', url: 'https://www.jpmorganchase.com/institute/all-topics/labor-markets-and-workforce/insight-online-platform-econ-earnings' },
    ],
    overallTier: 'weak',
  },
  {
    id: 'pay-picture-mexico-informality',
    category: 'makingItPay',
    title: 'More than half of the people working in Mexico work without social security',
    teaser: "Mexico's statistics office put the labour informality rate at 55.1% in the second quarter of 2026, up from 54.8% a year earlier.",
    summary:
      "INEGI, Mexico's national statistics office, measures labour informality every quarter: people working without access to social security through their work, whether self-employed, in a small unregistered business or employed without registration. In the second quarter of 2026 the rate was 55.1% of people working, against 54.8% a year earlier. Informality is not the same as self-employment, and many self-employed people are registered. It does mean that a large share of working people in Mexico already carry what an employer would otherwise carry: health care, a pension and time off. Since 2024 independent workers can join IMSS on their own, which the overhead entries cover.",
    citations: [
      { source: 'INEGI, Encuesta Nacional de Ocupación y Empleo (ENOE), Boletín 503/26, second quarter of 2026 (25 August 2026)', url: 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/enoe/enoe2026_08.pdf' },
    ],
    overallTier: 'strong',
    relatedIds: ['pay-overhead-elsewhere'],
  },

  // --- Could it pay? -----------------------------------------------------------------
  {
    id: 'pay-could-the-hour',
    category: 'makingItPay',
    title: 'What an hour comes to depends on counting every hour, not only the making',
    teaser: 'Photographing, listing, packing, answering messages and keeping the books are hours too, and leaving them out makes an hour look larger than it is.',
    summary:
      "The sum is short: what comes in, minus materials, fees taken from each sale, and the costs that come every month whatever sells, divided by the hours. The part most often left out is the hours. Making the thing is only part of it; photographing it, listing it, buying materials, packing, posting, answering questions and keeping records all take time that no sale pays for on its own. The US Small Business Administration's guidance on starting costs makes the same point for money: list every one-time and every monthly cost before working out a price. The Could This Pay? worksheet on Interests > Money works this sum from your numbers and lists every number it used beside the result. It cannot say whether people will buy, and neither can any sum.",
    citations: [
      { source: 'US Small Business Administration, Calculate your startup costs', url: 'https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs' },
    ],
    overallTier: 'moderate',
  },
  {
    id: 'pay-could-cushion',
    category: 'makingItPay',
    title: 'Most one-person businesses in the US are paid for at first from the owner’s savings',
    teaser: 'In the Federal Reserve 2025 survey of firms with no employees, 64% relied on the owners’ personal funds, against 54% of firms with employees.',
    summary:
      "The Federal Reserve's Small Business Credit Survey asks firms how they run and pay for themselves. Its 2026 report on firms with no employees, from the 2025 survey, found they were less likely to be profitable than firms with employees, and that 64% relied on the owners' personal funds, against 54% of firms with employees. Put beside the income swings in the entry above, this is why people who start something usually work out two amounts before they begin: what it costs to start, and how many months of their usual living costs they would want put by while sales are slow or uneven. The worksheet's Before starting fields work out that second amount from your numbers. How many months is a choice nobody else can make for you.",
    citations: [
      { source: 'Federal Reserve Banks, Small Business Credit Survey, 2026 Report on Nonemployer Firms (2025 survey, July 2026)', url: 'https://www.fedsmallbusiness.org/2026-report-on-nonemployer-firms' },
    ],
    overallTier: 'moderate',
    relatedIds: ['pay-picture-income-swings', 'pay-could-the-hour'],
  },
  {
    id: 'pay-could-pastime-changes',
    category: 'makingItPay',
    title: 'In laboratory experiments, rewards lowered interest in tasks people enjoyed, a finding still disputed',
    teaser: 'A 1999 review of 128 experiments found that expected rewards lowered how much people chose a task for its own sake, and other researchers dispute it.',
    summary:
      "Deci, Koestner and Ryan combined 128 experiments in 1999 and found that tangible rewards given for doing a task lowered how often people went back to it in their free time, and how interesting they said it was, while praise and positive feedback raised both. Cameron and Pierce, analysing much of the same literature, argued the effect was small and limited to particular kinds of reward, and the disagreement has not been settled. The experiments were short tasks in a laboratory, mostly with students and children, which is a long way from years of a craft. The work leaves a question worth asking yourself: whether the part you enjoy is the part a sale pays for. Plenty of people keep an interest unpaid on purpose, and that is a complete way of being part of it.",
    citations: [
      { source: 'Deci, Koestner and Ryan 1999, Psychological Bulletin 125(6):627-68, meta-analysis of 128 experiments', url: 'https://pubmed.ncbi.nlm.nih.gov/10589297/' },
    ],
    overallTier: 'moderate',
  },

  // --- The overhead of any business ---------------------------------------------------
  {
    id: 'pay-overhead-us-self-employment-tax',
    category: 'makingItPay',
    title: 'In the US, self-employed people pay both halves of Social Security and Medicare, 15.3%',
    teaser: 'For 2026 the self-employment tax is 12.4% for Social Security up to $184,500 and 2.9% for Medicare with no cap, on top of income tax.',
    summary:
      "An employer pays half of an employee's Social Security and Medicare tax. A self-employed person pays both halves, as self-employment tax, once net earnings from self-employment reach $400 in a year. The rate is 15.3%: 12.4% for Social Security, on earnings up to $184,500 for 2026, and 2.9% for Medicare with no cap. It is worked out on 92.35% of net earnings, half of it can be deducted when working out income tax, and an extra 0.9% Medicare tax applies above $200,000 for a single filer. Income tax comes on top, and none of it is taken out of a sale automatically, which is why the worksheet asks what share you want to set aside. The IRS, a tax preparer or an accountant can say how it applies to you.",
    citations: [
      { source: 'Internal Revenue Service, Publication 334 (2025), Tax Guide for Small Business, self-employment tax', url: 'https://www.irs.gov/publications/p334' },
      { source: 'Internal Revenue Service, Self-employment tax (Social Security and Medicare taxes)', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes' },
    ],
    overallTier: 'strong',
  },
  {
    id: 'pay-overhead-uk',
    category: 'makingItPay',
    title: 'In the UK, the first £1,000 a year of trading income is tax free, and National Insurance starts higher up',
    teaser: 'The trading allowance covers the first £1,000 of self-employed income, and Class 4 National Insurance for 2026 to 2027 is 6% on profits from £12,570 to £50,270.',
    summary:
      "HMRC's trading allowance lets a person earn up to £1,000 a year from self-employment or casual work, such as selling things they make, without paying tax on it, and income at or under that usually does not need reporting. Above £1,000 a person registers for Self Assessment by 5 October after the tax year. The allowance is used instead of claiming expenses, not as well as them, and it is shared across everything a person sells, not one allowance per business. For 2026 to 2027, Class 4 National Insurance is 6% on profits between £12,570 and £50,270 and 2% above that. Class 2 is voluntary below £7,105 of profit, at £3.65 a week, and paying it can protect a State Pension record. HMRC or an accountant can say how it applies to you.",
    citations: [
      { source: 'GOV.UK, Tax-free allowances on property and trading income', url: 'https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income' },
      { source: 'GOV.UK, Self-employed National Insurance rates', url: 'https://www.gov.uk/self-employed-national-insurance-rates' },
    ],
    overallTier: 'strong',
  },
  {
    id: 'pay-overhead-elsewhere',
    category: 'makingItPay',
    title: 'In Canada, Australia and Mexico, what an employer would carry falls to the self-employed person',
    teaser: 'Canada asks for both halves of the pension contribution, Australia does not require a sole trader to pay super for themselves, and Mexico lets independent workers join IMSS on their own.',
    summary:
      "Canada: a self-employed person pays both the employee and the employer share of Canada Pension Plan contributions, worked out from net business income on the tax return. Australia: a sole trader is not required to pay the superannuation guarantee for themselves, so saving for retirement is a choice they make and pay for, and some personal contributions can be claimed as a deduction. Running the business through a company changes that. Mexico: since rules published in 2024, independent workers can join the IMSS mandatory scheme voluntarily, paying in advance each month on an income they declare, which brings medical care, sick pay and pension saving. In each country the tax office or social security office says how it applies to you.",
    citations: [
      { source: 'Government of Canada, Canada Pension Plan contributions', url: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/contributions.html' },
      { source: 'Australian Taxation Office, Super for sole traders and partnerships', url: 'https://www.ato.gov.au/businesses-and-organisations/super-for-employers/work-out-if-you-have-to-pay-super/super-for-sole-traders-and-partnerships' },
      { source: 'IMSS, Personas trabajadoras independientes', url: 'https://www.imss.gob.mx/personas-trabajadoras-independientes' },
    ],
    overallTier: 'moderate',
    relatedIds: ['pay-picture-mexico-informality'],
  },

  // --- Health, neurodivergence and self-employment -------------------------------------
  {
    id: 'pay-health-disability-rates',
    category: 'makingItPay',
    title: 'US workers with a disability are more often self-employed and more often part time',
    teaser: 'In 2025, 9.1% of US workers with a disability were self-employed, against 5.9% of workers without one.',
    summary:
      "The Bureau of Labor Statistics reports every year on work and disability. In 2025, 9.1% of workers with a disability were self-employed, against 5.9% of those without, and about 30% of workers with a disability usually worked part time, against 17%. The release does not say why. Choosing when and how much to work is one likely reason, and having fewer other options is another, and the figures cannot tell the two apart. They count people with a disability as the survey defines it, which leaves out many people living with a chronic condition that comes and goes.",
    citations: [
      { source: 'US Bureau of Labor Statistics, Persons with a Disability: Labor Force Characteristics, 2025 (3 March 2026)', url: 'https://www.bls.gov/news.release/archives/disabl_03032026.htm' },
    ],
    overallTier: 'strong',
  },
  {
    id: 'pay-health-disability-benefits',
    category: 'makingItPay',
    title: 'Earning while on US disability benefits has monthly thresholds that change every January',
    teaser: 'For 2026, a month of SSDI trial work starts at $1,210, or more than 80 hours of self-employment, and substantial gainful activity is $1,690 a month.',
    summary:
      "Social Security Disability Insurance lets a person test working for nine months, the trial work period, without losing benefits. For 2026 a month counts toward the nine when earnings are $1,210 or more, or when a self-employed person works more than 80 hours in it; Social Security has announced $1,270 for 2027. After the trial period, earnings above substantial gainful activity, $1,690 a month for 2026 or $2,830 for someone who is blind, can stop cash benefits. Supplemental Security Income counts earnings by different rules. Social Security's free Work Incentives Planning and Assistance counsellors can say how selling something would count for you before it starts.",
    citations: [
      { source: 'Social Security Administration, Substantial Gainful Activity', url: 'https://www.ssa.gov/oact/cola/sga.html' },
      { source: 'Social Security Administration, Trial Work Period', url: 'https://www.ssa.gov/oact/cola/twp.html' },
      { source: 'Social Security Administration, 2026 Working While Disabled: How We Can Help', url: 'https://www.ssa.gov/pubs/EN-05-10095.pdf' },
    ],
    overallTier: 'strong',
  },
  {
    id: 'pay-health-adhd-entrepreneurs',
    category: 'makingItPay',
    title: 'Interviews with 14 business owners with ADHD describe hyperfocus and quick action at work',
    teaser: 'A 2016 study of 14 entrepreneurs diagnosed with ADHD found they described impulsivity as moving them to act and hyperfocus as carrying the work.',
    summary:
      "Wiklund, Patzelt and Dimov interviewed 14 people diagnosed with ADHD who were running businesses. They described impulsivity as what moved them to act, often without much planning, and hyperfocus as what carried the work once they were in it. It is a small study of people who were already in business, so it says nothing about how many people with ADHD try selling and stop, or how often the same traits cost them. It is a description of some people's experience, not evidence that ADHD suits self-employment. For anyone whose attention works this way, the parts of a business no sale pays for (records, tax dates, reordering) are the parts the reminders and schedules elsewhere in this app are built to hold.",
    citations: [
      { source: 'Wiklund, Patzelt and Dimov 2016, Journal of Business Venturing Insights 6:14-20, qualitative study of 14 entrepreneurs with ADHD', url: 'https://doi.org/10.1016/j.jbvi.2016.07.001' },
    ],
    overallTier: 'weak',
  },

  // --- If you decide to try -----------------------------------------------------------
  {
    id: 'pay-trying-records',
    category: 'makingItPay',
    title: 'Tax offices ask for records of every sale and every cost, kept from the first one',
    teaser: 'The IRS and HMRC both ask self-employed people to keep records of what came in and what went out, with receipts, for years afterwards.',
    summary:
      "The IRS asks a self-employed person to keep records of gross receipts, purchases and expenses, with the papers behind them, generally for at least three years after filing. HMRC asks for records of all sales and business costs, kept for at least five years after the 31 January filing deadline for that year. Keeping what comes in and what goes out for an interest apart from the household's money makes those records far easier to pull together. Interests > Money keeps each amount on its day with what it was for, and the prices kept on supplies count there too, so nothing has to be typed twice.",
    citations: [
      { source: 'Internal Revenue Service, Recordkeeping for small businesses', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping' },
      { source: 'GOV.UK, Business records if you’re self-employed', url: 'https://www.gov.uk/self-employed-records' },
    ],
    overallTier: 'strong',
  },
  {
    id: 'pay-trying-where-to-ask',
    category: 'makingItPay',
    title: 'Free advice for a small business is offered by government-backed centres in most countries',
    teaser: 'In the US, Small Business Development Centers and SCORE mentors are free; in the UK, GOV.UK walks through setting up as a sole trader.',
    summary:
      "In the US, the Small Business Administration funds Small Business Development Centers and SCORE, whose advisers and volunteer mentors meet people for free to go through costs, pricing, registration and records. The SBA's local assistance finder lists the ones nearest you. In the UK, GOV.UK sets out what registering as a sole trader involves, and local growth hubs offer advice. A local tax office or an accountant is where a question about your tax belongs. None of these will decide for you. Whether an interest is something to sell from, keep as it is, or leave for now is yours to decide.",
    citations: [
      { source: 'US Small Business Administration, Local assistance', url: 'https://www.sba.gov/local-assistance' },
      { source: 'GOV.UK, Set up as a sole trader', url: 'https://www.gov.uk/set-up-sole-trader' },
    ],
    overallTier: 'moderate',
  },
];
