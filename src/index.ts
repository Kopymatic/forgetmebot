import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";
import * as dotenv from "dotenv-flow"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { ActivityTypes, Client, Constants, Guild, User } from "oceanic.js";
import { CommandHandler } from "oceanic.js-interactions";
import { DataTypes, Sequelize } from "sequelize";
import { NoContext } from "./oldTables";
import Commands from "./commands";
import Cumulonimbus from "cumulonimbus-wrapper";

dotenv.config();

export const prisma = new PrismaClient();
export let client: Client;
export let handler: CommandHandler;
export let cumulonimbus: Cumulonimbus;

async function main() {
  client = new Client({
    auth: `Bot ${process.env.BOT_TOKEN}`,
    gateway: {
      intents: [
        "GUILDS",
        "DIRECT_MESSAGES",
        "GUILD_MESSAGES",
        "MESSAGE_CONTENT",
      ],
    },
  });
  handler = new CommandHandler(client);
  if (!process.env.CUM_TOKEN) {
    console.log("NO CUM TOKEN??? UNACCEPTABLE");
    return;
  }
  cumulonimbus = new Cumulonimbus(process.env.CUM_TOKEN);

  // Handle unregistered message components.
  handler.on("unhandledMessageComponent", (interaction) => {
    interaction.createMessage({
      content: "i forgor 💀",
      flags: Constants.MessageFlags.EPHEMERAL,
    });
  });

  client.once("ready", async () => {
    console.log("Ready as", client.user?.username);

    console.log("Publishing Commands");

    handler.publishCommands();

    client.editStatus("online", [
      { name: "Version 0.0.1", type: ActivityTypes.WATCHING },
    ]);
  });

  client.on("error", (err) => {
    console.error("Something Broke!", err);
  });

  handler.on("error", (err) => {
    console.error("Something Broke in the handler!", err);
  });

  console.log(" Registering slash commands...");
  // Register the command modules
  for (const command of Commands) {
    console.log(` Adding command ${command.name}...`);
    handler.registerCommand(command);
  }

  client.connect();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
