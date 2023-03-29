import { Guild as dbGuild, User as dbUser } from "@prisma/client";
import { Guild, User } from "oceanic.js";
import { prisma } from "..";

interface GuildAndUser {
  guild: dbGuild | null;
  user: dbUser | null;
}

export async function getGuildAndUser(
  guildId: string,
  userId: string
): Promise<GuildAndUser> {
  let guild = await getGuild(guildId);
  let user = await getUser(userId);

  return { guild: guild, user: user };
}

export async function getGuild(guildId: string) {
  return await prisma.guild.findFirst({ where: { id: guildId } });
}

export async function getUser(userId: string) {
  return await prisma.user.findFirst({ where: { id: userId } });
}

export async function updateGuild(guild: Guild) {
  let updated = await prisma.guild.update({
    where: { id: guild.id },
    data: { name: guild.name, iconUrl: guild.iconURL() },
  });
  if (!updated) {
    return createGuild(guild);
  } else {
    return updated;
  }
}

export async function updateUser(user: User) {
  let updated = await prisma.user.update({
    where: { id: user.id },
    data: { username: user.username, avatarUrl: user.avatarURL() },
  });
  if (!updated) {
    return createUser(user);
  } else {
    return updated;
  }
}

export async function createGuild(guild: Guild) {
  let created = await prisma.guild.create({
    data: { id: guild.id, name: guild.name, iconUrl: guild.iconURL() },
  });
  return created;
}

export async function createUser(user: User) {
  let created = await prisma.user.create({
    data: { id: user.id, username: user.username, avatarUrl: user.avatarURL() },
  });
  return created;
}
