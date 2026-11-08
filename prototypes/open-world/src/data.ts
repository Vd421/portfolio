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
    'Electrical and Electronics Engineering graduate from VIT Chennai, now at HCLTech building for MetLife.',
    'My work sits where AI meets real users: session replay that flags bugs on its own, career tools grounded in real data, and computer vision that runs on actual hardware.',
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
    summary: 'Records real user sessions, plays them back, and has an AI model flag the moments where something broke.',
    objective: 'Jump straight to the second a session went wrong, without reading logs.',
    stack: [],
    main: true,
    link: null,
  },
  {
    id: 'careerpilot',
    title: 'CareerPilot AI',
    kicker: 'AI career copilot',
    summary: '',
    objective: 'Turn a career question into a plan grounded in real data.',
    stack: [],
    link: null,
  },
  {
    id: 'tracker',
    title: 'Soccer Player Tracker',
    kicker: 'Real-time multi-object tracking',
    summary: 'Tracks every player through a match in real time, keeping identities stable across frames.',
    objective: 'Keep the same ID on every player through crossings and occlusions.',
    stack: ['Python', 'YOLOv8', 'Re-ID', 'OpenCV'],
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
  { when: 'Oct – Nov 2023', title: 'Software Developer Intern', where: 'Vertex Info Soft', body: 'Built and optimized application modules with an emphasis on testing and debugging.' },
  { when: null, title: 'GenAI Intern', where: 'Hapticware', body: null },
  { when: null, title: null, where: 'HCLTech · MetLife', body: null, now: true },
]

export const abilities = [
  { name: 'Languages', items: ['Python', 'C++', 'Java', 'C', 'Embedded C', 'HTML'] },
  { name: 'AI and vision', items: ['PyTorch', 'TensorFlow', 'OpenCV', 'YOLOv8', 'YOLOv3', 'LLM APIs'] },
  { name: 'Web and backend', items: ['FastAPI', 'Flask', 'React'] },
  { name: 'Hardware', items: ['Arduino', 'Ultrasonic sensors', 'Sensor fusion'] },
]

/** Loading-screen tips: real facts about Vaibhav only. Strings starting with TODO are skipped. */
export const tips: string[] = [
  'Vaibhav studied Electrical and Electronics Engineering at VIT Chennai, class of 2025.',
  'He works at HCLTech on the MetLife account.',
  'Replay records real user sessions and has AI flag the moment something broke.',
  'His soccer tracker keeps every player’s ID stable through crossings and occlusions.',
  'He builds hardware too: an obstacle-sensing walking aid and a fire-fighting robot.',
  'He is based in Delhi, India.',
]

/** Top-right HUD counter. `null` means unknown: it renders as a TODO placeholder, never a guess. */
export type HudStat = { label: string; value: number | null; prefix?: string }
export const hudStats: HudStat[] = [
  { label: 'Years coding', value: null },
  { label: 'Projects shipped', value: null },
  { label: 'GitHub commits', value: null },
]

/** Self-rated skill level out of 5 for the HUD stars. `null` until Vaibhav sets it. */
export const skillLevel: number | null = null
