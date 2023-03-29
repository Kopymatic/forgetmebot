import { NoContext, User } from "@prisma/client";
import { randomInt } from "crypto";
import { ButtonStyles, ComponentTypes, Embed } from "oceanic.js";
import {
  OptionBuilder,
  SlashCommand,
  Subcommand,
} from "oceanic.js-interactions";
import { cumulonimbus, prisma } from "..";
import { getUser, updateGuild, updateUser } from "../utils/db";
import { Colors } from "../utils/colors";

export const noContext = new SlashCommand(
  "nocontext",
  "All the NoContext commands!",
  {
    dmPermissions: false,
  }
);

const noContextView = new Subcommand(
  "view",
  "Shows a random image from the guild!",
  { dmPermissions: false },
  {
    id: OptionBuilder.Integer("The id to view", false),
  },
  async (args, interaction) => {
    const message = await interaction.acknowledge(false);
    if (!interaction.guild) {
      await message.edit({ content: "This command cannot be used in dms!" });
      return;
    }
    const guild = await updateGuild(interaction.guild);
    await updateUser(interaction.user);

    let entry: NoContext | null = null;
    if (args.id) {
      let candidate = await prisma.noContext.findFirst({
        where: { guild: guild, id: args.id },
      });
      if (!candidate) {
        message.edit({
          embeds: [{ color: Colors.ERROR, title: "No entries found!" }],
        });
      } else {
        entry = candidate;
      }
    } else {
      let entries = await prisma.noContext.findMany({
        where: { guild: guild },
      });
      entry = entries[randomInt(entries.length - 1)];
    }

    if (!entry) {
      message.edit({
        embeds: [{ color: Colors.ERROR, title: "No entries found!" }],
      });
      return;
    }

    message.edit({
      embeds: [await getEmbed(entry)],
    });
  }
);

noContext.addSubcommand(noContextView);

const noContextFind = new Subcommand(
  "find",
  "Finds an image from the guild!",
  { dmPermissions: false },
  {
    search: OptionBuilder.String("The term to search for.", true),
  },
  async (args, interaction) => {
    const message = await interaction.acknowledge(false);
    if (!interaction.guild) {
      await message.edit({ content: "This command cannot be used in dms!" });
      return;
    }
    const guild = await updateGuild(interaction.guild);
    const user = await updateUser(interaction.user);

    let entries: NoContext[];
    if (args.search === "all") {
      entries = await prisma.noContext.findMany({ where: { guild: guild } });
    } else {
      entries = await prisma.noContext.findMany({
        where: {
          guild: guild,
          textTag: { equals: args.search, mode: "insensitive" },
        },
      });
    }

    let entryStrings = entries.map(
      (value) => `#${value.id}: ${value.imageLink}`
    );

    let content = `Found ${entryStrings.length} results\n${entryStrings.join(
      "\n"
    )}${
      entryStrings.length > 0
        ? "\nDo '/nocontext view [id]' for more details\n*We are aware that this format isn't ideal, and are working to fix it.*"
        : ""
    }`;
    if (content.length >= 2000) {
      message.edit({
        content:
          "Too many results!\nWe are aware this isn't ideal, and are working to fix it. In the meantime, try a more specific search.",
      });
      return;
    }

    //TODO: Figure out how to paginate stuff.
    message.edit({
      content: content,
    });
  }
);

noContext.addSubcommand(noContextFind);

const noContextImport = new Subcommand(
  "import",
  "Imports an image",
  { dmPermissions: false },
  {
    image: OptionBuilder.Attachment("the image to import", true),
    description: OptionBuilder.String("the description for the image", true),
  },
  async (args, interaction) => {
    const message = await interaction.acknowledge(false);
    if (!interaction.guild) {
      await message.edit({ content: "This command cannot be used in dms!" });
      return;
    }
    const guild = await updateGuild(interaction.guild);
    const user = await updateUser(interaction.user);

    //Upload to cumulonimbus
    const result = await fetch(args.image.url);
    const blob = await result.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    const response = await cumulonimbus.upload(buffer);

    const finalUrl = response.result.url;
    console.log(finalUrl);

    let entry = await prisma.noContext.create({
      data: {
        guild: { connect: { id: guild.id } },
        importer: { connect: { id: user.id } },
        imageLink: finalUrl,
        textTag: args.description,
      },
    });

    message.edit({
      content: "Successfully imported!",
      embeds: [await getEmbed(entry)],
      components: [
        {
          type: ComponentTypes.ACTION_ROW,
          components: [
            {
              type: ComponentTypes.BUTTON,
              style: ButtonStyles.LINK,
              url: "https://www.kopy.gay/projects/forgetmebot/privacy",
              label: "How we handle your data.",
            },
          ],
        },
      ],
    });
  }
);

noContext.addSubcommand(noContextImport);

const noContextOwner = new Subcommand(
  "owner",
  "OWNER ONLY",
  { dmPermissions: false },
  {
    id: OptionBuilder.Integer("The id to view", false),
  },
  async (args, interaction) => {
    const message = await interaction.acknowledge(true);
    if (interaction.user.id !== "326489320980611075") {
      message.edit({ content: "You can't use this." });
      return;
    }
    if (!interaction.guild) {
      await message.edit({ content: "This command cannot be used in dms!" });
      return;
    }
    const guild = await updateGuild(interaction.guild);
    const user = await updateUser(interaction.user);

    let entry: NoContext | null = null;
    if (args.id) {
      entry = await prisma.noContext.findFirst({
        where: { id: args.id, importerId: { not: "326489320980611075" } },
      });
    } else {
      let entries = await prisma.noContext.findMany({
        where: { importerId: { not: "326489320980611075" } },
      });
      entry = entries[randomInt(entries.length - 1)];
    }

    if (!entry) {
      message.edit({
        embeds: [{ color: Colors.ERROR, title: "No entries found!" }],
      });
      return;
    }

    message.edit({
      embeds: [await getEmbed(entry)],
    });
  }
);

noContext.addSubcommand(noContextOwner);

async function getEmbed(entry: NoContext, user?: User): Promise<Embed> {
  let userEntry: User | null;
  if (user) {
    userEntry = user;
  } else {
    userEntry = await getUser(entry.importerId);
  }

  return {
    color: Colors.DEFAULT,
    title: `NoContext #${entry.id}`,
    description: entry.textTag ? entry.textTag : undefined,
    image: { url: entry.imageLink },
    footer: {
      text: `Imported by ${
        user ? user.username : entry.importerId
      } on ${entry.createdAt.toDateString()}`,
      iconURL: user?.avatarUrl ? user.avatarUrl : undefined,
    },
  };
}
