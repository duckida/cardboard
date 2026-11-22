export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'What we think, we become.', author: 'Buddha' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'Whether you think you can or you think you can’t, you’re right.', author: 'Henry Ford' },
  { text: 'It always seems impossible until it’s done.', author: 'Nelson Mandela' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'Creativity is intelligence having fun.', author: 'Albert Einstein' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese proverb' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'Not all those who wander are lost.', author: 'J. R. R. Tolkien' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'You miss 100% of the shots you don’t take.', author: 'Wayne Gretzky' },
  { text: 'Everything you can imagine is real.', author: 'Pablo Picasso' },
  { text: 'Stay hungry, stay foolish.', author: 'Stewart Brand' },
  { text: 'A ship in harbour is safe, but that is not what ships are built for.', author: 'John A. Shedd' },
  { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt' },
  { text: 'Courage is grace under pressure.', author: 'Ernest Hemingway' },
  { text: 'Make it simple, but significant.', author: 'Don Draper' },
  { text: 'If you’re going through hell, keep going.', author: 'Winston Churchill' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', author: 'Chinese proverb' },
  { text: 'Comparison is the thief of joy.', author: 'Theodore Roosevelt' },
  { text: 'Little by little, a little becomes a lot.', author: 'Tanzanian proverb' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'The obstacle is the way.', author: 'Marcus Aurelius' },
  { text: 'What you do makes a difference, and you have to decide what kind of difference you want to make.', author: 'Jane Goodall' },
];

export function quoteFor(seed: number): Quote {
  return QUOTES[Math.abs(Math.floor(seed)) % QUOTES.length];
}
