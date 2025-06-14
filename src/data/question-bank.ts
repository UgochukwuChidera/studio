
export type Subject = "Mathematics" | "Physics" | "Chemistry" | "Biology" | "English Language" | "History" | "Geography" | "Computer Science" | "General Knowledge";
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  subject: Subject;
  topic: string;
  difficulty: Difficulty;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export const questionBank: Question[] = [
  // Mathematics
  {
    id: "math001",
    subject: "Mathematics",
    topic: "Algebra",
    difficulty: "easy",
    questionText: "Solve for x: 2x + 5 = 15",
    options: ["3", "5", "7", "10"],
    correctOptionIndex: 1,
    explanation: "Subtract 5 from both sides: 2x = 10. Then divide by 2: x = 5."
  },
  {
    id: "math002",
    subject: "Mathematics",
    topic: "Geometry",
    difficulty: "medium",
    questionText: "What is the area of a circle with a radius of 7 units?",
    options: ["14π sq units", "49π sq units", "7π sq units", "28π sq units"],
    correctOptionIndex: 1,
    explanation: "The area of a circle is given by the formula A = πr². Here, r = 7, so A = π(7²) = 49π."
  },
  {
    id: "math003",
    subject: "Mathematics",
    topic: "Calculus",
    difficulty: "hard",
    questionText: "What is the derivative of f(x) = x³ - 6x² + 5x - 10?",
    options: ["3x² - 12x + 5", "x² - 6x + 5", "3x³ - 12x² + 5x", "3x² - 6x + 5"],
    correctOptionIndex: 0,
    explanation: "Using the power rule, the derivative of xⁿ is nxⁿ⁻¹. So, d/dx(x³) = 3x², d/dx(-6x²) = -12x, d/dx(5x) = 5, and d/dx(-10) = 0."
  },
  {
    id: "math004",
    subject: "Mathematics",
    topic: "Probability",
    difficulty: "medium",
    questionText: "What is the probability of rolling a 6 on a standard six-sided die?",
    options: ["1/6", "1/3", "1/2", "5/6"],
    correctOptionIndex: 0,
    explanation: "There is one favorable outcome (rolling a 6) out of six possible outcomes."
  },
   {
    id: "math005",
    subject: "Mathematics",
    topic: "Trigonometry",
    difficulty: "hard",
    questionText: "If sin(θ) = 3/5 and θ is in the first quadrant, what is cos(θ)?",
    options: ["3/5", "4/5", "5/4", "5/3"],
    correctOptionIndex: 1,
    explanation: "Using the identity sin²(θ) + cos²(θ) = 1. So, cos²(θ) = 1 - (3/5)² = 1 - 9/25 = 16/25. Thus, cos(θ) = 4/5 (since θ is in the first quadrant)."
  },

  // Physics
  {
    id: "phy001",
    subject: "Physics",
    topic: "Mechanics",
    difficulty: "easy",
    questionText: "What is Newton's first law of motion also known as?",
    options: ["Law of Action-Reaction", "Law of Universal Gravitation", "Law of Inertia", "Law of Acceleration"],
    correctOptionIndex: 2,
    explanation: "Newton's first law states that an object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force. This is the principle of inertia."
  },
  {
    id: "phy002",
    subject: "Physics",
    topic: "Optics",
    difficulty: "medium",
    questionText: "Which phenomenon causes a rainbow?",
    options: ["Reflection", "Refraction", "Dispersion", "Diffraction"],
    correctOptionIndex: 2,
    explanation: "Dispersion of sunlight by water droplets in the atmosphere causes a rainbow. Refraction and reflection are also involved, but dispersion is key to separating colors."
  },
  {
    id: "phy003",
    subject: "Physics",
    topic: "Thermodynamics",
    difficulty: "hard",
    questionText: "What is the SI unit of temperature?",
    options: ["Celsius", "Fahrenheit", "Kelvin", "Rankine"],
    correctOptionIndex: 2,
    explanation: "The Kelvin (K) is the base unit of thermodynamic temperature in the International System of Units (SI)."
  },
   {
    id: "phy004",
    subject: "Physics",
    topic: "Electricity",
    difficulty: "easy",
    questionText: "What is the unit of electrical resistance?",
    options: ["Volt", "Ampere", "Ohm", "Watt"],
    correctOptionIndex: 2,
    explanation: "The Ohm (Ω) is the SI unit of electrical resistance."
  },

  // Chemistry
  {
    id: "chem001",
    subject: "Chemistry",
    topic: "Atomic Structure",
    difficulty: "easy",
    questionText: "What is the chemical symbol for water?",
    options: ["H₂O", "CO₂", "O₂", "NaCl"],
    correctOptionIndex: 0,
    explanation: "Water is composed of two hydrogen atoms and one oxygen atom, hence H₂O."
  },
  {
    id: "chem002",
    subject: "Chemistry",
    topic: "Acids and Bases",
    difficulty: "medium",
    questionText: "What is the pH of a neutral solution?",
    options: ["0", "7", "14", "1"],
    correctOptionIndex: 1,
    explanation: "A pH of 7 is considered neutral. Values below 7 are acidic, and values above 7 are alkaline (basic)."
  },
  {
    id: "chem003",
    subject: "Chemistry",
    topic: "Periodic Table",
    difficulty: "easy",
    questionText: "What is the chemical symbol for Gold?",
    options: ["Ag", "Au", "Gd", "Go"],
    correctOptionIndex: 1,
    explanation: "The chemical symbol for Gold is Au, derived from its Latin name 'aurum'."
  },
  {
    id: "chem004",
    subject: "Chemistry",
    topic: "Organic Chemistry",
    difficulty: "hard",
    questionText: "Which of the following is an alkane: C₂H₄, C₃H₆, C₄H₁₀, C₅H₈?",
    options: ["C₂H₄ (Ethene)", "C₃H₆ (Propene)", "C₄H₁₀ (Butane)", "C₅H₈ (Pentyne)"],
    correctOptionIndex: 2,
    explanation: "Alkanes have the general formula CₙH₂ₙ₊₂. Butane (C₄H₁₀) fits this formula (4*2+2=10)."
  },


  // Biology
  {
    id: "bio001",
    subject: "Biology",
    topic: "Cell Biology",
    difficulty: "easy",
    questionText: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"],
    correctOptionIndex: 2,
    explanation: "Mitochondria are responsible for generating most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
  },
  {
    id: "bio002",
    subject: "Biology",
    topic: "Genetics",
    difficulty: "medium",
    questionText: "Who is known as the father of genetics?",
    options: ["Charles Darwin", "Gregor Mendel", "Louis Pasteur", "James Watson"],
    correctOptionIndex: 1,
    explanation: "Gregor Mendel, through his work on pea plants, discovered the fundamental laws of inheritance."
  },
  {
    id: "bio003",
    subject: "Biology",
    topic: "Photosynthesis",
    difficulty: "medium",
    questionText: "What gas do plants primarily absorb from the atmosphere for photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
    correctOptionIndex: 2,
    explanation: "Plants absorb carbon dioxide (CO₂) from the atmosphere to use in the process of photosynthesis."
  },
  {
    id: "bio004",
    subject: "Biology",
    topic: "Human Anatomy",
    difficulty: "hard",
    questionText: "How many bones are in the adult human body?",
    options: ["206", "212", "198", "220"],
    correctOptionIndex: 0,
    explanation: "The adult human skeleton typically consists of 206 bones."
  },
  
  // English Language
  {
    id: "eng001",
    subject: "English Language",
    topic: "Grammar",
    difficulty: "easy",
    questionText: "Which of the following is a preposition: 'run', 'quickly', 'under', 'beautiful'?",
    options: ["run", "quickly", "under", "beautiful"],
    correctOptionIndex: 2,
    explanation: "'Under' is a preposition, indicating location or position."
  },
  {
    id: "eng002",
    subject: "English Language",
    topic: "Vocabulary",
    difficulty: "medium",
    questionText: "What is a synonym for 'ephemeral'?",
    options: ["Eternal", "Lasting", "Short-lived", "Strong"],
    correctOptionIndex: 2,
    explanation: "'Ephemeral' means lasting for a very short time."
  },
  {
    id: "eng003",
    subject: "English Language",
    topic: "Literature",
    difficulty: "hard",
    questionText: "Who wrote 'Pride and Prejudice'?",
    options: ["Charlotte Brontë", "Emily Brontë", "Jane Austen", "George Eliot"],
    correctOptionIndex: 2,
    explanation: "'Pride and Prejudice' was written by Jane Austen."
  },
  {
    id: "eng004",
    subject: "English Language",
    topic: "Figures of Speech",
    difficulty: "medium",
    questionText: "Identify the figure of speech: 'The wind whispered through the trees.'",
    options: ["Metaphor", "Simile", "Personification", "Hyperbole"],
    correctOptionIndex: 2,
    explanation: "Personification gives human qualities (whispering) to an inanimate object (wind)."
  },

  // History
  {
    id: "hist001",
    subject: "History",
    topic: "Ancient Civilizations",
    difficulty: "easy",
    questionText: "Which ancient civilization built the pyramids of Giza?",
    options: ["Roman", "Greek", "Egyptian", "Mesopotamian"],
    correctOptionIndex: 2,
    explanation: "The ancient Egyptians built the pyramids of Giza."
  },
  {
    id: "hist002",
    subject: "History",
    topic: "World War II",
    difficulty: "medium",
    questionText: "In which year did World War II end?",
    options: ["1939", "1941", "1945", "1950"],
    correctOptionIndex: 2,
    explanation: "World War II officially ended in 1945."
  },
  {
    id: "hist003",
    subject: "History",
    topic: "Renaissance",
    difficulty: "medium",
    questionText: "The Renaissance began in which country?",
    options: ["France", "England", "Italy", "Spain"],
    correctOptionIndex: 2,
    explanation: "The Renaissance is widely considered to have begun in Italy in the 14th century."
  },
   {
    id: "hist004",
    subject: "History",
    topic: "American Revolution",
    difficulty: "hard",
    questionText: "What was the main reason for the Boston Tea Party?",
    options: ["Taxation without representation", "Religious freedom", "Land disputes", "Abolition of slavery"],
    correctOptionIndex: 0,
    explanation: "The Boston Tea Party was a protest against British taxation policies, specifically the Tea Act, under the banner of 'no taxation without representation'."
  },

  // Geography
  {
    id: "geo001",
    subject: "Geography",
    topic: "Rivers",
    difficulty: "easy",
    questionText: "What is the longest river in the world?",
    options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
    correctOptionIndex: 1, 
    explanation: "The Nile River is traditionally considered the longest river in the world, though the Amazon is very close and sometimes argued as longer depending on the measurement criteria."
  },
  {
    id: "geo002",
    subject: "Geography",
    topic: "Mountains",
    difficulty: "medium",
    questionText: "Mount Everest is located in which mountain range?",
    options: ["Andes", "Rockies", "Alps", "Himalayas"],
    correctOptionIndex: 3,
    explanation: "Mount Everest, the world's highest peak, is part of the Himalayas mountain range."
  },
  {
    id: "geo003",
    subject: "Geography",
    topic: "Oceans",
    difficulty: "easy",
    questionText: "Which is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correctOptionIndex: 3,
    explanation: "The Pacific Ocean is the largest and deepest of Earth's five oceanic divisions."
  },
  {
    id: "geo004",
    subject: "Geography",
    topic: "Deserts",
    difficulty: "hard",
    questionText: "The Sahara Desert is primarily located on which continent?",
    options: ["Asia", "South America", "Africa", "Australia"],
    correctOptionIndex: 2,
    explanation: "The Sahara Desert, the largest hot desert in the world, is located in Northern Africa."
  },

  // Computer Science
  {
    id: "cs001",
    subject: "Computer Science",
    topic: "Programming Basics",
    difficulty: "easy",
    questionText: "What does 'CPU' stand for?",
    options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Unit", "Control Processing Unit"],
    correctOptionIndex: 0,
    explanation: "CPU stands for Central Processing Unit, the primary component of a computer that executes instructions."
  },
  {
    id: "cs002",
    subject: "Computer Science",
    topic: "Data Structures",
    difficulty: "medium",
    questionText: "Which data structure uses LIFO (Last-In, First-Out) principle?",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    correctOptionIndex: 1,
    explanation: "A stack is a linear data structure that follows the LIFO principle."
  },
  {
    id: "cs003",
    subject: "Computer Science",
    topic: "Algorithms",
    difficulty: "hard",
    questionText: "What is the time complexity of a binary search algorithm in the worst-case scenario?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(n²)"],
    correctOptionIndex: 1,
    explanation: "Binary search works by repeatedly dividing the search interval in half. Its worst-case time complexity is O(log n)."
  },
  {
    id: "cs004",
    subject: "Computer Science",
    topic: "Networking",
    difficulty: "medium",
    questionText: "What does 'HTTP' stand for in web addresses?",
    options: ["HyperText Transfer Protocol", "HyperText Transmission Protocol", "HighText Transfer Protocol", "HyperText Type Protocol"],
    correctOptionIndex: 0,
    explanation: "HTTP stands for HyperText Transfer Protocol, which is the foundation of data communication for the World Wide Web."
  },
  
  // General Knowledge
  {
    id: "gk001",
    subject: "General Knowledge",
    topic: "World Capitals",
    difficulty: "easy",
    questionText: "What is the capital of Japan?",
    options: ["Beijing", "Seoul", "Tokyo", "Bangkok"],
    correctOptionIndex: 2,
    explanation: "Tokyo is the capital city of Japan."
  },
  {
    id: "gk002",
    subject: "General Knowledge",
    topic: "Science Facts",
    difficulty: "medium",
    questionText: "How many planets are in our Solar System?",
    options: ["7", "8", "9", "10"],
    correctOptionIndex: 1,
    explanation: "There are 8 planets in our Solar System (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune). Pluto was reclassified as a dwarf planet."
  },
  {
    id: "gk003",
    subject: "General Knowledge",
    topic: "Art",
    difficulty: "hard",
    questionText: "Who painted 'Starry Night'?",
    options: ["Claude Monet", "Pablo Picasso", "Leonardo da Vinci", "Vincent van Gogh"],
    correctOptionIndex: 3,
    explanation: "'Starry Night' is an oil-on-canvas painting by the Dutch Post-Impressionist painter Vincent van Gogh."
  },
  {
    id: "gk004",
    subject: "General Knowledge",
    topic: "Inventions",
    difficulty: "easy",
    questionText: "Who is credited with inventing the telephone?",
    options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"],
    correctOptionIndex: 2,
    explanation: "Alexander Graham Bell is widely credited with patenting the first practical telephone."
  },
  // Adding a few more for diversity in difficulty
  {
    id: "math006",
    subject: "Mathematics",
    topic: "Statistics",
    difficulty: "easy",
    questionText: "What is the mode of the following set of numbers: 2, 3, 3, 4, 5, 5, 5, 6?",
    options: ["3", "4", "5", "6"],
    correctOptionIndex: 2,
    explanation: "The mode is the number that appears most frequently in a data set. In this set, 5 appears three times."
  },
  {
    id: "phy005",
    subject: "Physics",
    topic: "Waves",
    difficulty: "medium",
    questionText: "What type of wave is light?",
    options: ["Longitudinal wave", "Transverse wave", "Mechanical wave", "Sound wave"],
    correctOptionIndex: 1,
    explanation: "Light is an electromagnetic wave, which is a type of transverse wave, meaning its oscillations are perpendicular to the direction of energy transfer."
  },
  {
    id: "chem005",
    subject: "Chemistry",
    topic: "Chemical Reactions",
    difficulty: "hard",
    questionText: "Balance the chemical equation: __CH₄ + __O₂ → __CO₂ + __H₂O",
    options: ["1, 2, 1, 2", "2, 1, 2, 1", "1, 1, 1, 1", "1, 2, 1, 1"],
    correctOptionIndex: 0,
    explanation: "The balanced equation is CH₄ + 2O₂ → CO₂ + 2H₂O, ensuring the same number of each atom on both sides."
  },
  {
    id: "bio005",
    subject: "Biology",
    topic: "Ecology",
    difficulty: "easy",
    questionText: "Which of these is a producer in an ecosystem?",
    options: ["Lion", "Grass", "Mushroom", "Deer"],
    correctOptionIndex: 1,
    explanation: "Producers, like grass, create their own food through photosynthesis. Lions and deer are consumers, and mushrooms are decomposers."
  },
  {
    id: "eng005",
    subject: "English Language",
    topic: "Punctuation",
    difficulty: "easy",
    questionText: "Which punctuation mark is used to end a declarative sentence?",
    options: ["Question Mark (?)", "Exclamation Point (!)", "Period (.)", "Comma (,)"],
    correctOptionIndex: 2,
    explanation: "A period (or full stop) is used to end a declarative sentence, which makes a statement."
  },
  {
    id: "cs005",
    subject: "Computer Science",
    topic: "Operating Systems",
    difficulty: "medium",
    questionText: "Which of the following is NOT an operating system: Windows, Linux, Microsoft Office, macOS?",
    options: ["Windows", "Linux", "Microsoft Office", "macOS"],
    correctOptionIndex: 2,
    explanation: "Microsoft Office is an application suite, while Windows, Linux, and macOS are operating systems."
  },
  {
    id: "gk005",
    subject: "General Knowledge",
    topic: "Mythology",
    difficulty: "hard",
    questionText: "In Greek mythology, who was the king of the gods?",
    options: ["Poseidon", "Hades", "Apollo", "Zeus"],
    correctOptionIndex: 3,
    explanation: "Zeus was the king of the gods on Mount Olympus in Greek mythology."
  }
  // This is a sample of ~40 questions. A full 1000-question bank would be much larger.
];
