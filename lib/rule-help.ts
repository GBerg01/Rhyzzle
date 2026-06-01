// Centralized rule education content for the Rhyzzle puzzle board.
// Static instructional definitions — not AI analysis, not scoring.
// Each entry maps to a rule chip in the lyric puzzle canvas.

export type RuleHelpKey =
  | "SETUP_RHYME"
  | "END_RHYME"
  | "RHYME_WITH_LINE"
  | "INTERNAL_RHYME"
  | "CHAIN_RHYME"
  | "METAPHOR"
  | "THEME_REFERENCE"
  | "PUNCHLINE"
  | "CALLBACK"
  | "ALLITERATION"
  | "ASSONANCE"
  | "REQUIRED_WORD"
  | "WRITE";

export interface RuleHelp {
  key: RuleHelpKey;
  label: string;
  // Tailwind classes for the badge chip (must match canvas palette)
  chipClass: string;
  textClass: string;
  shortDefinition: string;
  example: string;
  tip: string;
}

export const RULE_HELP: Record<RuleHelpKey, RuleHelp> = {
  SETUP_RHYME: {
    key: "SETUP_RHYME",
    label: "Setup Rhyme",
    chipClass: "bg-yellow-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "A line that introduces the sound or idea another line will rhyme back to. You're planting the seed — the next matching line will pay it off.",
    example: "I kept my dreams folded deep inside the window",
    tip: "End with a strong, open-vowel word that gives the next line something satisfying to rhyme with.",
  },

  END_RHYME: {
    key: "END_RHYME",
    label: "End Rhyme",
    chipClass: "bg-cyan-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "The last important word or sound in this line should rhyme with another line. It's what makes verses feel locked in and complete.",
    example: "I stayed low through the pressure / Then rose up from the wreckage",
    tip: "Strong end rhymes don't have to be perfect — \"pressure\" and \"wreckage\" both end in the same sound. Near-rhymes count.",
  },

  RHYME_WITH_LINE: {
    key: "RHYME_WITH_LINE",
    label: "Rhyme With Line",
    chipClass: "bg-cyan-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "This line needs to connect back to the rhyme sound from an earlier line. End on a word that echoes or matches the sound you set up before.",
    example: "Line 1 ends with \"window\" → Line 2 could end with \"tempo\" or \"letting go\"",
    tip: "The rhyme doesn't have to be perfect. If the sounds feel related when spoken aloud, it works.",
  },

  INTERNAL_RHYME: {
    key: "INTERNAL_RHYME",
    label: "Internal Rhyme",
    chipClass: "bg-cyan-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Rhyming words appear inside the same line instead of only at the end. The line contains its own little rhyme loop.",
    example: "I move through the room with the smoothest tune",
    tip: "Try placing two similar sounds before you reach the end of the line. \"room\" and \"smoothest\" — both in the same bar.",
  },

  CHAIN_RHYME: {
    key: "CHAIN_RHYME",
    label: "Chain Rhyme",
    chipClass: "bg-cyan-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Start this line with a word that rhymes with the last word of the previous line. The rhyme chains forward instead of pairing up.",
    example: "Line ends with \"night\" → next line starts with \"right\" or \"light\"",
    tip: "It's subtle but creates a flowing, locked-in feel. Start strong, then finish the line however you want.",
  },

  METAPHOR: {
    key: "METAPHOR",
    label: "Metaphor",
    chipClass: "bg-green-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Describe one thing as another thing to make an image stronger. Say something IS something else — not that it's like it.",
    example: "My heart is a locked room",
    tip: "Don't use \"like\" or \"as\" — that becomes a simile. Just say it directly: \"my city is a cage\" or \"time is a debt.\"",
  },

  THEME_REFERENCE: {
    key: "THEME_REFERENCE",
    label: "Theme",
    chipClass: "bg-green-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Include an image, idea, or phrase that connects to the challenge theme. Don't just name the theme — make it feel present.",
    example: "If the theme is pressure: \"Diamonds only form when the weight gets heavy.\"",
    tip: "Don't just drop the word in. Make the idea live in the line. Show the theme through what you describe.",
  },

  PUNCHLINE: {
    key: "PUNCHLINE",
    label: "Punchline",
    chipClass: "bg-purple-500",
    textClass: "text-white",
    shortDefinition:
      "A clever or surprising line that lands with impact. It twists what came before or drops something unexpected. This is where you make the listener react.",
    example: "They said I lost my spark — I turned the blackout into fireworks.",
    tip: "Set up the idea first, then twist it. The best punchlines feel inevitable in hindsight but surprising in the moment.",
  },

  CALLBACK: {
    key: "CALLBACK",
    label: "Callback",
    chipClass: "bg-pink-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Bring back a word, image, or idea from an earlier line in the verse. It creates a sense of completion — like the verse is talking to itself.",
    example: "If Line 1 mentions \"window\" → Line 8 could say \"Now I own the view.\"",
    tip: "Callbacks make the verse feel written, not just freestyled. Go back and reread your first lines before writing this one.",
  },

  ALLITERATION: {
    key: "ALLITERATION",
    label: "Alliteration",
    chipClass: "bg-amber-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Repeating the same starting sound across multiple words in the line. It creates rhythm and makes lines stick in the ear.",
    example: "Cold city corners couldn't close me",
    tip: "Use it for style and flow, but don't force it — 2 or 3 matching sounds is plenty. Too many sounds unnatural.",
  },

  ASSONANCE: {
    key: "ASSONANCE",
    label: "Assonance",
    chipClass: "bg-cyan-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "Repeating similar vowel sounds across words in the line. It's subtler than rhyme but makes lines feel smooth and musical.",
    example: "I ride by the bright lights",
    tip: "\"ride,\" \"bright,\" \"lights\" — all share the long-I sound. This can make lines feel cohesive even when words don't perfectly rhyme.",
  },

  REQUIRED_WORD: {
    key: "REQUIRED_WORD",
    label: "Required Word",
    chipClass: "bg-amber-400",
    textClass: "text-zinc-900",
    shortDefinition:
      "A specific word must appear somewhere in your bars. It has to be in the verse, but it doesn't have to be forced — find a natural place for it.",
    example: "If the required word is \"gold\": \"Everything I built from scratch is starting to show gold.\"",
    tip: "Read the required words first, then write. It's easier to build toward them than to cram them in at the end.",
  },

  WRITE: {
    key: "WRITE",
    label: "Write",
    chipClass: "bg-zinc-400",
    textClass: "text-white",
    shortDefinition:
      "No special constraint on this line — just write a strong bar. Focus on imagery, flow, or continuing the thought from the previous line.",
    example: "Whatever comes to you. This is your open line.",
    tip: "Use this freedom strategically. Set up the next rhyme, build tension, or let a strong image breathe.",
  },
};
