// Shared TypeScript types for Rhyzzle.
// These mirror the Prisma schema but are safe to use in client components.

// ─── Enums ─────────────────────────────────────────────────────────────────

export type RoomStatus = "LOBBY" | "WRITING" | "VOTING" | "REVEAL" | "CLOSED";
export type RoomPrivacy = "PRIVATE" | "PUBLIC";
export type VotingMode = "ANONYMOUS" | "OPEN";
export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";

export type ConstraintType =
  | "LINE_COUNT"
  | "END_RHYME"
  | "INTERNAL_RHYME"
  | "LINE_START_RHYMES_WITH_PREVIOUS_END"
  | "METAPHOR"
  | "PUNCHLINE"
  | "CALLBACK"
  | "ALLITERATION"
  | "ASSONANCE"
  | "REQUIRED_WORD"
  | "THEME_REFERENCE"
  | "RHYME_SCHEME";

export type HighlightCategory =
  | "END_RHYME"
  | "INTERNAL_RHYME"
  | "ALLITERATION"
  | "ASSONANCE"
  | "METAPHOR"
  | "PUNCHLINE"
  | "DOUBLE_MEANING"
  | "CALLBACK"
  | "REQUIRED_WORD"
  | "FAILED_REQUIREMENT";

// ─── Core DTOs ─────────────────────────────────────────────────────────────

export interface BeatDTO {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string;
  bpm: number | null;
  genre: string | null;
  durationSec: number | null;
  coverUrl: string | null;
  tags: string[];
}

export interface ChallengeRuleDTO {
  id: string;
  type: ConstraintType;
  lineIndex: number | null;
  targetLine: number | null;
  rhymeScheme: string | null;
  theme: string | null;
  description: string;
  sortOrder: number;
}

export interface RequiredWordDTO {
  id: string;
  word: string;
  sortOrder: number;
}

export interface ChallengeDTO {
  id: string;
  title: string;
  description: string | null;
  barCount: number;
  rules: ChallengeRuleDTO[];
  requiredWords: RequiredWordDTO[];
}

export interface ParticipantDTO {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: string;
  hasSubmitted: boolean;
}

export interface SubmissionLineDTO {
  id: string;
  lineIndex: number;
  text: string;
  highlightSpans: HighlightSpanDTO[];
}

export interface SubmissionDTO {
  id: string;
  participantId: string;
  nickname: string | null; // null when anonymous
  rawText: string;
  lines: SubmissionLineDTO[];
  voteCount: number;
  isWinner?: boolean;
  constraintResults: ConstraintResultDTO[];
}

export interface HighlightSpanDTO {
  id: string;
  startIndex: number;
  endIndex: number;
  category: HighlightCategory;
  color: string;
  confidence: number | null;
  explanation: string | null;
}

export interface ConstraintResultDTO {
  ruleType: ConstraintType;
  lineIndex: number | null;
  passed: boolean;
  confidence: number | null;
  explanation: string | null;
}

// ─── Room State (returned by GET /api/rooms/[roomCode]) ───────────────────

export interface RoomStateDTO {
  id: string;
  roomCode: string;
  name: string | null;
  status: RoomStatus;
  privacy: RoomPrivacy;
  votingMode: VotingMode;
  deadline: string | null;
  beat: BeatDTO;
  challenge: ChallengeDTO;
  participants: ParticipantDTO[];
  submittedCount: number;
  totalCount: number;
  isHost: boolean;
  // Set server-side by reading rhyzzle_participant cookie — non-null means this browser is already in the room
  currentParticipantId: string | null;
  // True if the current participant has already submitted their bars this round
  currentParticipantHasSubmitted: boolean;
  // Only present in VOTING and REVEAL states
  submissions?: SubmissionDTO[];
}

// ─── API Request/Response Types ────────────────────────────────────────────

export interface CreateRoomRequest {
  beatId: string;
  challengeId: string;
  hostNickname: string;
  name?: string;
  privacy?: RoomPrivacy;
  votingMode?: VotingMode;
  deadline?: string; // ISO date string
}

export interface CreateRoomResponse {
  roomCode: string;
  roomId: string;
  hostParticipantId: string;
}

export interface JoinRoomRequest {
  nickname: string;
}

export interface JoinRoomResponse {
  participantId: string;
  sessionToken: string;
  nickname: string;
  isHost: boolean;
}

export interface SubmitBarsRequest {
  lines: string[]; // array of bar text, one per line
}

export interface SubmitBarsResponse {
  submissionId: string;
}

export interface CastVoteRequest {
  submissionId: string;
}

export interface CastVoteResponse {
  success: boolean;
}

// ─── Sample Data Types (for seed/dev) ─────────────────────────────────────

export interface SampleBeat {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  bpm: number;
  genre: string;
  durationSec: number;
  coverUrl: string;
  tags: string[];
}

export interface SampleChallenge {
  id: string;
  title: string;
  description: string;
  barCount: 4 | 6 | 8;
  rules: Array<{
    type: ConstraintType;
    lineIndex?: number;
    targetLine?: number;
    rhymeScheme?: string;
    theme?: string;
    description: string;
  }>;
  requiredWords?: string[];
}

// ─── UI State ──────────────────────────────────────────────────────────────

// The lines the user is actively writing in the bar editor
export type BarEditorLines = string[];

// Which phase the room page is showing
export type RoomPhase = RoomStatus;
