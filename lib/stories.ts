/**
 * "Applications that got in". SAMPLE data: illustrative applications written by Outcomes to show students
 * what a strong application looks like. Founders are fictional, and nothing here is a real application or
 * endorsed by the programme. Questions are paraphrased from public sources (see `questionsNote`).
 * Real stories from seniors will replace these once they're collected (see README → Applications that got in).
 */
export interface StoryAnswer {
  q: string;                 // the question as the form asks it
  limit?: string;            // e.g. "50 characters", "1 minute"
  required?: boolean;
  a: string;                 // the sample answer
  why: string;               // coach note: why this answer works
}
export interface StorySection { title: string; answers: StoryAnswer[] }
export interface StoryStep { label: string; when: string; note: string }

export interface Story {
  slug: string;
  sample: true;
  program: { name: string; short: string; site: string; domain: string; brand: string; programSlug?: string };
  outcome: string;           // "Selected · Winter 2027 batch"
  deal: string;              // what the programme gives, as publicly reported
  founder: { names: string; line: string; stage: string };
  idea: string;              // one line
  questionsNote: string;     // how close the questions are to the real form
  sources: { label: string; url: string }[];
  steps: StoryStep[];
  sections: StorySection[];
  differently: string[];     // what they'd do differently
}

export const STORIES: Story[] = [
  {
    slug: "y-combinator-sample",
    sample: true,
    program: { name: "Y Combinator", short: "YC", site: "https://www.ycombinator.com/apply", domain: "ycombinator.com", brand: "#F26522", programSlug: "y-combinator" },
    outcome: "Selected · Winter 2027 batch",
    deal: "$500K standard deal ($125K for 7% + $375K uncapped MFN SAFE), as publicly described by YC",
    founder: { names: "Riya Menon & Arjun Rao (fictional)", line: "SSB '25 · ex-fintech analyst + full-stack engineer", stage: "Early revenue" },
    idea: "Ledgerly: auto-matches GST invoices for small Indian businesses so they stop losing input tax credit.",
    questionsNote: "Close to the real form. YC's questions are long-standing and widely documented; the live form sits behind a login, so wording may differ slightly.",
    sources: [
      { label: "ycombinator.com/apply", url: "https://www.ycombinator.com/apply" },
      { label: "YC standard deal", url: "https://www.ycombinator.com/deal" },
    ],
    steps: [
      { label: "Applied", when: "Oct 2026", note: "Submitted 10 days before the deadline, then updated metrics once." },
      { label: "Interview", when: "Nov 2026", note: "10-minute video call. Mostly questions about users and revenue." },
      { label: "Selected", when: "Dec 2026", note: "Offer call the same evening." },
    ],
    sections: [
      { title: "Founders", answers: [
        { q: "Who writes code, or does other technical work on your product? Was any of it done by a non-founder?", required: true,
          a: "Arjun writes all the code. Riya built the GST matching rules and our first 40 test datasets. No outside developers.",
          why: "Direct and specific. YC wants to know the founders can build without outsourcing." },
        { q: "Please tell us about an impressive thing you've built or achieved.", required: true,
          a: "In college Arjun built a timetable app that 3,800 students used every week, running on ₹600/month of servers. Riya cut her fintech team's month-end reconciliation from 6 days to 2 by writing Excel macros nobody asked for.",
          why: "Numbers over adjectives. Each line shows initiative and a measurable result." },
        { q: "Tell us about the time you most successfully hacked some (non-computer) system to your advantage.",
          a: "Our college canteen ran out of food by 1pm. Riya noticed the vendor priced by plate count, so she organised pre-orders through a WhatsApp group and got the vendor to cook to demand. Waste fell and the queue disappeared.",
          why: "Shows resourcefulness in the real world, which is exactly what this question is fishing for." },
        { q: "How long have the founders known one another and how did you meet?", required: true,
          a: "Four years. We met in our first week at SSB and have shipped three projects together since.",
          why: "Short, and it answers the real worry: will this team stay together?" },
      ]},
      { title: "Founder video", answers: [
        { q: "Upload a one-minute video introducing the founder(s).", limit: "1 minute", required: true,
          a: "Both founders on camera, plain background. 0:00 who we are · 0:15 the problem in one sentence · 0:30 a 15-second screen recording of a match happening · 0:50 our traction.",
          why: "No script reading, no music. YC watches thousands; clear and human beats polished." },
      ]},
      { title: "Company", answers: [
        { q: "Describe what your company does in 50 characters or less.", limit: "50 characters", required: true,
          a: "GST invoice matching for Indian small businesses",
          why: "Plain words a stranger understands instantly. No buzzwords, no \"AI-powered platform\"." },
        { q: "What is your company going to make? Please describe your product and what it does or will do.", required: true,
          a: "Small businesses in India lose input tax credit when their invoices don't match what suppliers filed. Ledgerly connects to their accounting software, pulls the government's GSTR-2B data every week, and flags every mismatch with the supplier to chase. Today an accountant does this by hand once a quarter; we do it automatically every week.",
          why: "Problem, how it works, and what it replaces, in four sentences." },
        { q: "Where do you live now, and where would the company be based after YC?",
          a: "Bangalore, India. We'd stay in Bangalore after the batch because our customers are here.",
          why: "Honest and reasoned. Location only matters if the answer is evasive." },
      ]},
      { title: "Progress", answers: [
        { q: "How far along are you?", required: true,
          a: "Live for 5 months. 64 paying businesses, 9 accounting firms reselling us.",
          why: "Leads with the strongest facts." },
        { q: "How long have each of you been working on this? How much of that has been full-time?",
          a: "8 months. Full-time for the last 5, since we graduated.",
          why: "Full-time commitment is a key signal. State it plainly." },
        { q: "Are people using your product? Do you have revenue?", required: true,
          a: "Yes. ₹3.1 lakh MRR, growing 22% month on month for the last 3 months. 2 customers have churned, both after closing their businesses.",
          why: "Growth rate plus an honest note on churn. Reviewers trust founders who share bad news." },
      ]},
      { title: "Idea", answers: [
        { q: "Why did you pick this idea to work on? Do you have domain expertise? How do you know people need what you're making?", required: true,
          a: "Riya spent two years reconciling invoices at a fintech and saw clients lose 2–4% of their purchases to unclaimed credit. Before writing code we spoke to 31 business owners; 26 said their accountant only checks quarterly.",
          why: "Earned insight plus evidence from real conversations, not assumptions." },
        { q: "Who are your competitors? What do you understand about your business that they don't?", required: true,
          a: "ClearTax and Tally add-ons exist, but they're built for accountants. We found the business owner, not the accountant, feels the pain and pays. So we sell to owners on WhatsApp, and accountants resell us.",
          why: "Names real competitors and states a sharp, non-obvious insight." },
        { q: "How do or will you make money? How much could you make?",
          a: "₹999–₹4,999 a month per business. India has over 1.4 crore GST-registered businesses; 1% of them is a ₹1,000 Cr+ a year opportunity.",
          why: "Simple pricing and back-of-envelope maths that a reader can check." },
      ]},
      { title: "Equity", answers: [
        { q: "Have you formed any legal entity yet?", a: "Yes, a private limited company in India, incorporated June 2026.", why: "A factual answer. Just be accurate." },
        { q: "Have you taken any investment yet?", a: "No. Bootstrapped from revenue and ₹2 lakh of our savings.", why: "A clean cap table is easy to say yes to." },
      ]},
      { title: "Curious", answers: [
        { q: "What convinced you to apply to Y Combinator? Did someone encourage you to apply?",
          a: "Two customers asked if we'd raise money. A YC founder we met at a Bangalore meetup told us to apply before we felt ready.",
          why: "Genuine and brief. There's no right answer here." },
      ]},
    ],
    differently: [
      "Record the video earlier. We redid it six times the night before the deadline.",
      "Update the application with new numbers. Our final MRR jump was noticed in the interview.",
      "Practise saying the 50-character line out loud. It's the first thing they ask.",
    ],
  },
  {
    slug: "entrepreneur-first-sample",
    sample: true,
    program: { name: "Entrepreneur First", short: "EF", site: "https://www.joinef.com", domain: "joinef.com", brand: "#0B1015" },
    outcome: "Selected · Bangalore cohort",
    deal: "Pre-team, pre-idea. Reported terms vary by location (e.g. up to $250K on the US pathway, or a $10K equity-free fellowship)",
    founder: { names: "Kabir Shah (fictional)", line: "SSB '24 · ML engineer, 2 years at a logistics startup", stage: "No idea or cofounder yet" },
    idea: "Joined without an idea. Formed a team in week 4 around AI route planning for city delivery fleets.",
    questionsNote: "Reconstructed. EF's form sits behind a login and isn't published; these questions reflect the topics EF and public guides describe (edge, motivation, what you've built).",
    sources: [
      { label: "joinef.com", url: "https://www.joinef.com" },
    ],
    steps: [
      { label: "Applied", when: "Jun 2026", note: "Short form, about 10 questions. Picked the Bangalore cohort." },
      { label: "First call", when: "Jun 2026", note: "Get-to-know-you call about past work and why now." },
      { label: "Interviews", when: "Jul 2026", note: "One technical deep-dive, one behavioural." },
      { label: "Selected", when: "Jul 2026", note: "Offer to join the next Bangalore cohort." },
    ],
    sections: [
      { title: "Cohort", answers: [
        { q: "Which location would you like to join? Can you commit full-time and in person?", required: true,
          a: "Bangalore. Yes, full-time from the cohort start date; I've agreed a notice period with my employer.",
          why: "EF is in person and full-time. A clear yes with a plan removes the biggest doubt." },
      ]},
      { title: "About you", answers: [
        { q: "What is your edge: the skill or insight that gives you an unfair advantage?", required: true,
          a: "I've shipped route-optimisation models that run on real delivery fleets: 1,200 vehicles a day across 4 Indian cities. I know where research models break on messy Indian addresses and traffic.",
          why: "EF backs individuals, so the edge must be specific, proven and hard to copy." },
        { q: "What is the most impressive thing you've built or achieved?", required: true,
          a: "A model that cut average delivery distance by 11% for my current employer, saving about ₹40 lakh a year. I built it alone in 3 months and it now runs every morning.",
          why: "One project, one result, with your personal role made clear." },
        { q: "Why do you want to start a company, and why now?", required: true,
          a: "I've spent two years making someone else's fleet efficient. Delivery volumes in India are doubling and most fleets still plan routes on paper. I want to build the tool for the 90% who can't hire an ML team, and I'd rather start before the window closes.",
          why: "Personal motivation plus a market reason for timing." },
      ]},
      { title: "Your space", answers: [
        { q: "What area or industry would you like to explore?",
          a: "Logistics and mobility for India: last-mile delivery, fleet planning, and warehouse routing.",
          why: "Open enough to meet a cofounder, focused enough to show conviction." },
        { q: "Are you technical? What would you look for in a cofounder?",
          a: "Yes, ML and backend. I'm looking for someone who has sold to operations teams and can own customers.",
          why: "Self-aware about gaps, which is what EF's team formation relies on." },
      ]},
      { title: "Links", answers: [
        { q: "CV, LinkedIn, GitHub and anything else you've made.",
          a: "CV · LinkedIn · GitHub (open-source route solver, 300 stars) · a blog post on routing in Indian cities.",
          why: "Proof of work they can click. Public work does more than a long CV." },
      ]},
    ],
    differently: [
      "Talk to EF alumni before applying. Their advice on the 'edge' answer changed mine completely.",
      "Prepare for the behavioural interview as seriously as the technical one.",
      "Come with a few problem areas, not a fixed idea. EF wants you open to your cofounder's view.",
    ],
  },
  {
    slug: "the-foundery-sample",
    sample: true,
    program: { name: "The Foundery", short: "Foundery", site: "https://thefoundery.in", domain: "thefoundery.in", brand: "#0B1015" },
    outcome: "Selected · Cohort 2 (Jan 2027, Alibaug)",
    deal: "90-day residential launchpad. Reported: seed funding up to ₹4 crore, founders keep up to 25% equity in ventures built there",
    founder: { names: "Sneha Iyer (fictional)", line: "SSB '25 · ran a campus snack business, 2 internships in D2C", stage: "Has proof of work, no fixed idea" },
    idea: "Took an idea from The Foundery's idea vault: a cloud-kitchen brand for office lunches in tier-2 cities.",
    questionsNote: "Reconstructed. The Foundery's form isn't public; press coverage describes the topics (background, achievements, proof of work) and the rounds that follow.",
    sources: [
      { label: "Outlook Business: Cohort 2 opens", url: "https://www.outlookbusiness.com/spotlight/pr-wire/the-foundery-opens-cohort-2-the-search-for-indias-next-generation-of-entrepreneurs-begins" },
      { label: "Entrackr: The Foundery launch", url: "https://entrackr.com/snippets/nikhil-kamath-and-kishore-biyani-launch-the-foundery-to-build-early-stage-startups-in-90-days-10931190" },
    ],
    steps: [
      { label: "Applied", when: "Sep 2026", note: "Online form with background and proof of work." },
      { label: "Idea round", when: "Oct 2026", note: "Explained a problem and how she'd approach it." },
      { label: "Challenge", when: "Oct 2026", note: "Timed problem-solving exercise on a real business case." },
      { label: "Interview", when: "Nov 2026", note: "Final conversation with the leadership team." },
      { label: "Selected", when: "Nov 2026", note: "Place in the residential cohort from 15 Jan 2027." },
    ],
    sections: [
      { title: "About you", answers: [
        { q: "Tell us about your background: education, where you're based, and what you do now.", required: true,
          a: "Final-year student at Scaler School of Business, Bangalore. Grew up in Coimbatore. Interned at two D2C food brands in growth and operations.",
          why: "Short and factual. Save the story for the questions that ask for it." },
        { q: "What are your proudest achievements so far?", required: true,
          a: "Ran a campus snack business for 18 months: ₹9 lakh in sales, 3 student staff, profitable from month 2. At my internship I cut a brand's delivery cancellations by 30% by fixing the cut-off times.",
          why: "Real numbers from things she ran herself. This is the 'shown they can build something' The Foundery asks for." },
      ]},
      { title: "Proof of work", answers: [
        { q: "Share links to things you've built, run or written: portfolio, case studies, projects.", required: true,
          a: "Snack business Instagram and sales sheet · a 2-page case study on the cancellations fix · a teardown of 3 cloud-kitchen brands.",
          why: "Evidence over claims. Even a simple sales sheet is proof." },
      ]},
      { title: "Shortlist rounds", answers: [
        { q: "Idea round: pick a problem you'd like to solve and explain how you'd approach it.",
          a: "Office workers in tier-2 cities have no reliable ₹150 lunch. I'd test with one office park: pre-orders on WhatsApp, one kitchen, a 10-item menu, and measure repeat orders in week 2.",
          why: "A small, testable first step beats a grand vision in a 10-minute round." },
        { q: "Problem-solving challenge: work through a live business case.",
          a: "Case: a kitchen losing money on 40% of orders. She asked for the order data first, found the losses were small orders far away, and proposed a minimum order plus a delivery radius.",
          why: "Asking for data before answering is the skill being tested." },
        { q: "Final interview: why you, and why now?",
          a: "I've already run a food business with my own money and I know the unit economics. I want 90 days of focus with people who've scaled consumer brands.",
          why: "Connects past proof to what the programme offers." },
      ]},
    ],
    differently: [
      "Bring your numbers. Every round asked 'how do you know?'",
      "For the challenge, think out loud. They cared more about the approach than the final answer.",
      "Don't over-polish the idea. The Foundery helps you pick one; show you can execute.",
    ],
  },
];

export const getStory = (slug: string) => STORIES.find((s) => s.slug === slug);
