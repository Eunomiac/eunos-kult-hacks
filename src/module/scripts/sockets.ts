import * as U from "./utilities.js";
import {SYSTEM_ID} from "./constants.js";

export enum UserTargetRef {
  gm = "gm", // The alert is shown to the GM.
  self = "self", // The alert is shown to the current user.
  all = "all", // The alert is shown to all connected users.
  players = "players", // The alert is shown to all users except the GM.
  other = "other", // The alert is shown to all users except the current user.
  otherPlayers = "otherPlayers" // The alert is shown to all users except the current user and the GM.
}

export type UserTarget = UserTargetRef|IDString|UUIDString;

// #region ░░░░░░░[SocketLib]░░░░ SocketLib Initialization ░░░░░░░ ~

// #endregion ░░░░[SocketLib]░░░░

const socketFunctions: Record<string, SocketFunction> = {};

export function getSocket(): Socket {
  let socket: Maybe<Socket> = socketlib.system;
  if (!socket) {
    socket = socketlib.modules.get(SYSTEM_ID);
  }
  if (!socket) {
    throw new Error(`[sockets.getSocket] No Socket Found for ${SYSTEM_ID}`);
  }
  return socket;
}

export function registerSocketFunctions(funcs: Record<string, SocketFunction>): void {
  for (const [fName, func] of Object.entries(funcs)) {
    getSocket().register(fName, func);
    socketFunctions[fName] = func;
  }
}

export function getUsersFromTarget(target: Maybe<UserTarget>): User[] {
  const selfUser = getUser();
  if (!target) { return [selfUser]; }
  if (U.isDocID(target)) {
    return [(getUsers().get(target) ?? undefined) as Maybe<User>]
      .filter((user: Maybe<User>) => user?.active) as User[];
  } else if (U.isDocUUID(target)) {
    return [(fromUuidSync(target) ?? undefined) as Maybe<User>]
      .filter((user: Maybe<User>) => user?.active) as User[];
  }
  const allUsers = (getUsers().contents as Maybe<User>[])
    .filter((user) => user?.active) as User[];
  const [
    gmUsers,
    playerUsers
  ] = U.partition<User>(allUsers, (user: User) => user.isGM);
  switch (target) {
    case UserTargetRef.all: return allUsers;
    case UserTargetRef.gm: return gmUsers;
    case UserTargetRef.other: return allUsers.filter((user) => user.id !== selfUser.id);
    case UserTargetRef.otherPlayers: return playerUsers.filter((user) => user.id !== selfUser.id);
    case UserTargetRef.players: return playerUsers;
    case UserTargetRef.self: return [selfUser];
    default: return [] as never;
  }
}

export async function call<RT = void>(funcName: string, targetUser: UserTarget, ...funcParameters: unknown[]): Promise<RT[]> {
  if (!(funcName in socketFunctions)) {
    throw new Error(`[K4Socket.Call] No Such Function Registered: ${funcName}`);
  }
  const userTargets = getUsersFromTarget(targetUser);
  const func = socketFunctions[funcName] as SocketFunction & AsyncFunc<RT>;

  return Promise.all(userTargets.map((user: User) => {
    return getSocket().executeAsUser(
      func,
      user.id!,
      ...funcParameters
    );
  }));
}
