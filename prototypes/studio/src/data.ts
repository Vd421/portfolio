// Facts only. Anything unknown is null and renders as a visible TODO chip.
export const person = {
  first: 'Vaibhav',
  last: 'Dhir',
  handle: 'vd',
  roles: ['Forward Deployed Engineer', 'Solutions Engineer', 'Full Stack AI Developer'],
  tagline: 'I build AI systems that ship, then sit with the people using them until they work.',
  base: 'Delhi, India',
  coords: '28.61°N  77.21°E',
  education: 'B.Tech EEE, VIT Chennai',
  gradYear: '2025',
  now: 'HCLTech, on the MetLife account',
  email: 'vaibhavdhir01@gmail.com',
  github: 'https://github.com/Vd421',
  linkedin: 'https://www.linkedin.com/in/vaibhav-dhir',
  about: [
    'Electrical and Electronics Engineering graduate from VIT Chennai (2021–2025), now an IT Offshore Associate at HCLTech on the MetLife account.',
    'My work sits where AI meets real users: session replay that flags where people got stuck, an AI agent that runs a job search end to end, LLM features in a production financial platform, and computer vision that tracks a whole match in real time.',
  ],
}

export type Mission = {
  id: string
  title: string
  kicker: string
  summary: string
  objective: string
  stack: string[]
  main?: boolean
  link: string | null
}

export const missions: Mission[] = [
  {
    id: 'replay',
    title: 'Replay',
    kicker: 'Session replay with AI bug flagging',
    summary: 'Records user interactions on a website and replays them in a React dashboard; AI analysis flags the sessions where users got stuck, so friction surfaces without manual review.',
    objective: 'Jump straight to the second a session went wrong, without reading logs.',
    stack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    main: true,
    link: null,
  },
  {
    id: 'careerpilot',
    title: 'CareerPilot AI',
    kicker: 'AI job-search agent',
    summary: 'Takes a job description, finds matching roles, applies, and tracks every application end to end, with automated SMS updates, recruiter follow-ups and referral requests.',
    objective: 'Go from a job description to tracked applications without the busywork.',
    stack: ['React', 'TypeScript', 'Node.js', 'Prisma', 'PostgreSQL', 'Claude API'],
    link: null,
  },
  {
    id: 'luna',
    title: 'Luna',
    kicker: 'Multimodal AI chatbot',
    summary: 'A full-stack conversational app that generates text and images with GPT-4 and DALL·E, with multi-turn memory and a Flask REST backend for conversation state.',
    objective: 'Keep one conversation going across text and images.',
    stack: ['Python', 'Flask', 'OpenAI API', 'DALL·E'],
    link: null,
  },
  {
    id: 'tracker',
    title: 'Soccer Player Tracker',
    kicker: 'Real-time multi-object tracking',
    summary: 'Tracks players, referees and the ball through a match in real time, with a re-identification pipeline that holds identities through occlusions and fast motion.',
    objective: 'Keep the same ID on every player through crossings and occlusions.',
    stack: ['Python', 'YOLOv8', 'DeepSORT', 'OpenCV'],
    link: null,
  },
  {
    id: 'cropweed',
    title: 'Crop and Weed Detector',
    kicker: 'Precision agriculture vision',
    summary: 'Tells crops from weeds in field images so treatment goes only where it is needed.',
    objective: 'Give operators a desktop tool that marks weeds field by field.',
    stack: ['Python', 'YOLOv3', 'OpenCV', 'Tkinter'],
    link: null,
  },
  {
    id: 'stick',
    title: 'AI Blind Stick',
    kicker: 'Assistive navigation hardware',
    summary: 'A walking aid that senses obstacles with ultrasonic sensors and guides its user around them.',
    objective: 'Get someone safely around what they cannot see.',
    stack: ['Embedded C', 'Arduino', 'Ultrasonic sensors'],
    link: null,
  },
  {
    id: 'firebot',
    title: 'Fire Fighter Bot',
    kicker: 'Autonomous detection and response',
    summary: 'An Arduino robot that finds a fire with fused sensor readings, drives to it and puts it out.',
    objective: 'Find the fire, reach it, put it out. No operator.',
    stack: ['Arduino', 'Embedded C', 'Sensor fusion'],
    link: null,
  },
]

export type Stop = { when: string | null; title: string | null; where: string; body: string | null; now?: boolean }

export const story: Stop[] = [
  { when: '2021 – 2025', title: 'B.Tech, EEE', where: 'VIT Chennai', body: 'Electrical and Electronics Engineering, with the projects that pulled me toward AI and computer vision.' },
  { when: 'Oct – Nov 2023', title: 'Software Developer Intern', where: 'Vertex Info Soft · Chandigarh', body: 'Built Flask and Firebase backend services and REST APIs; query optimization and caching cut response time by 30%, and stricter debugging and automated tests cut production bugs by 40%.' },
  { when: 'May – Jun 2025', title: 'Generative AI Engineer Intern', where: 'Hapticware · Remote', body: 'Integrated OpenAI LLM APIs for real-time question answering and document summarization in a production financial platform. Prompt workflows cut API response latency by 40%; LangChain and vector-database pipelines power context-aware answers.' },
  { when: 'Aug 2026', title: 'IT Offshore Associate', where: 'HCLTech · MetLife · Noida', body: 'Support MetLife’s global IT service desk under ITIL: incident triage and escalation in ServiceNow within SLAs, identity and access in Microsoft Entra ID, and Microsoft 365, Intune and SCCM support.', now: true },
]

export const abilities = [
  { name: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'C++', 'Java'] },
  { name: 'AI and ML', items: ['Claude API', 'OpenAI API', 'LangChain', 'RAG', 'PyTorch', 'OpenCV', 'YOLOv8'] },
  { name: 'Web and backend', items: ['React', 'Node.js', 'FastAPI', 'Flask', 'Prisma'] },
  { name: 'Data and cloud', items: ['PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'Entra ID'] },
  { name: 'Hardware', items: ['Arduino', 'Embedded C'] },
]

/** Loading-screen tips: real facts about Vaibhav only. Strings starting with TODO are skipped. */
export const tips: string[] = [
  'Vaibhav studied Electrical and Electronics Engineering at VIT Chennai, class of 2025.',
  'He works at HCLTech on the MetLife account.',
  'At Hapticware, his prompt workflows cut LLM API response latency by 40%.',
  'CareerPilot AI takes a job description and runs the whole application process, powered by the Claude API.',
  'Replay records real user sessions and has AI flag where people got stuck.',
  'His soccer tracker keeps every player’s ID stable through crossings and occlusions.',
  'He builds hardware too: an obstacle-sensing walking aid and a fire-fighting robot.',
  'He is based in Delhi, India.',
]

/** Top-right HUD counter. `null` means unknown: it renders as a TODO placeholder, never a guess. */
export type HudStat = { label: string; value: number | null; prefix?: string }
export const hudStats: HudStat[] = [
  { label: 'Years coding', value: null },
  { label: 'Projects built', value: missions.length },
  { label: 'GitHub commits', value: null },
]

/** Self-rated skill level out of 5 for the HUD stars. `null` until Vaibhav sets it. */
export const skillLevel: number | null = null

/** About-section stat bars, 0–10. Areas come from real work; levels are Vaibhav's call, so `null` = TODO. */
export type Stat = { label: string; value: number | null }
export const aboutStats: Stat[] = [
  { label: 'AI and LLM apps', value: null },
  { label: 'Computer vision', value: null },
  { label: 'Full-stack web', value: null },
  { label: 'Embedded and hardware', value: null },
  { label: 'Working with customers', value: null },
]

/** Home page sections, in order. The minimap and bottom nav are built from this list. */
export const sections = [
  { id: 'hero', label: 'Home', short: 'Home' },
  { id: 'about', label: 'About', short: 'About' },
  { id: 'projects', label: 'Projects', short: 'Work' },
  { id: 'experience', label: 'Experience', short: 'Career' },
  { id: 'skills', label: 'Skills', short: 'Skills' },
  { id: 'contact', label: 'Contact', short: 'Contact' },
] as const
export type SectionId = (typeof sections)[number]['id']
