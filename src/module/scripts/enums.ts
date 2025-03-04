export enum GamePhase {
  SessionClosed = "SessionClosed",
  SessionLoading = "SessionLoading",
  SessionStarting = "SessionStarting",
  SessionRunning = "SessionRunning",
  SessionEnding = "SessionEnding"
}

export enum InitializerMethod {
  PreInitialize = "PreInitialize",
  Initialize = "Initialize",
  PostInitialize = "PostInitialize"
}

export enum EunosMediaTypes {
  audio = "audio",
  video = "video"
}

export enum PCTargetRef {
  all = "all",
  self = "self",
  others = "others"
}

export enum PCState {
  masked = "masked",
  hidden = "hidden",
  dimmed = "dimmed",
  base = "base",
  spotlit = "spotlit"
}

export enum NPCState {
  invisible = "invisible",
  shrouded = "shrouded",
  dimmed = "dimmed",
  base = "base",
  spotlit = "spotlit"
}


export enum MediaLoadStatus {
  NotConnected = "NotConnected",
  NotStarted = "NotStarted",
  Loading = "Loading",
  Ready = "Ready",
  LoadPending = "LoadPending",
  PreloadNotRequested = "PreloadNotRequested",
}

/** Enum for user targeting in socket operations */
export enum UserTargetRef {
  gm = "gm", // The alert is shown to the GM.
  self = "self", // The alert is shown to the current user.
  all = "all", // The alert is shown to all connected users.
  players = "players", // The alert is shown to all users except the GM.
  other = "other", // The alert is shown to all users except the current user.
  otherPlayers = "otherPlayers", // The alert is shown to all users except the current user and the GM.
}

export enum AlertType {
  simple = "simple",
  seriousWound = "seriousWound",
  criticalWound = "criticalWound",
  stability = "stability",
  shatterIllusion = "shatterIllusion",
  gmNotice = "gmNotice",
  test = "test",
  central = "central"
};
