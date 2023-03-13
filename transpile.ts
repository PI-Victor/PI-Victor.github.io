import { marked } from "marked";
import Handlebars from "handlebars";
import hljs from "highlight.js";
import toml from "toml";
import customHeadingId from "marked-custom-heading-id";

marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function (code, lang) {
    // const hljs = require("highlight.js");
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: "hljs language-", // highlight.js css expects a top-level 'hljs' class.
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartypants: false,
  xhtml: false,
});

marked.use(customHeadingId({}));

async function cleanUp() {
  const publicDir = "./docs";

  try {
    await Deno.remove(publicDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw new Error(`failed to remove dir: ${e}}`);
    }
  }

  await Deno.mkdir(publicDir);
}

class Post {
  date: string;
  contents: string;
  title: string;
  slugs: string[];
  reference: string;

  constructor() {
    this.date = "";
    this.contents = "";
    this.title = "";
    this.slugs = [];
    this.reference = "";
  }
}

async function readFiles(): Promise<Post[]> {
  const postsPath = "./posts";

  try {
    const posts: Post[] = [];

    for await (
      const file of Deno.readDir(`${postsPath}`)
    ) {
      const post = new Post();
      if (file.name.endsWith(".md") === true) {
        const postContent = await Deno.readTextFile(
          `${postsPath}/${file.name}`,
        );

        const tomlFile = `${postsPath}/${file.name.replace(".md", ".toml")}`;
        const tomlConfig = await Deno.readTextFile(tomlFile);
        const postMeta = toml.parse(tomlConfig);

        post.title = postMeta.post.title;
        post.contents = postContent;
        post.date = postMeta.post.date;
        post.slugs = postMeta.post.slugs;

        posts.push(post);
      }
      continue;
    }
    return posts;
  } catch (e) {
    throw new Error(`failed to list dir: ${e}}`);
  }
}

async function generatePages(): Promise<Post[]> {
  const template = await Deno.readTextFile("./templates/post.html");

  try {
    const posts = await readFiles();

    for (const post of posts) {
      const contents = marked.parse(post.contents);
      const filePath = `./docs`;

      try {
        const body = Handlebars.compile(template, { noEscape: true });
        const pagePath = `${filePath}/${
          post.title.toLowerCase().replaceAll(" ", "-")
        }.html`;
        await Deno.writeTextFile(
          pagePath,
          body({ contents, slugs: post.slugs, title: post.title }),
        );
        post.reference = pagePath;
      } catch (e) {
        throw new Error(`failed to write file (${filePath}): ${e}}`);
      }
    }

    return posts;
  } catch (e) {
    throw new Error(`failed to open file: ${e}}`);
  }
}

async function copyAssets() {
  const assetsPath = "./assets";

  try {
    await Deno.mkdirSync("./docs/assets");

    for await (const asset of Deno.readDir(assetsPath)) {
      await Deno.copyFile(
        `${assetsPath}/${asset.name}`,
        `./docs/assets/${asset.name}`,
      );
    }
  } catch (e) {
    throw new Error(`failed to copy file: ${e}}`);
  }
}

async function generateIndex(posts: Post[]) {
  try {
    const indexTemplate = await Deno.readTextFile("./templates/index.html");
    const homeContent = await Deno.readTextFile("./static/home.md");
    const content = marked.parse(homeContent);
    const body = Handlebars.compile(indexTemplate, { noEscape: true });

    const pages = posts.map((post) => {
      post.reference = post.reference.replace("./docs/", "");
      return post;
    });

    const anchors = [
      {
        title: "Personal Info",
        reference: "personal-info",
      },
      {
        title: "Professional interests",
        reference: "professional-interests",
      },
      {
        title: "Tech competencies",
        reference: "tech-competencies",
      },
      {
        title: "Relevant work experience",
        reference: "relevant-work-experience",
      },
      {
        title: "Other things",
        reference: "other-things",
      },
    ];

    await Deno.writeTextFile(
      "./docs/index.html",
      body({ content, pages, anchors }),
    );
  } catch (e) {
    throw new Error(`failed to open file: ${e}}`);
  }
}

async function generateNotes(posts: Post[]) {
  try {
    const notesTemplate = await Deno.readTextFile("./templates/notes.html");
    const body = Handlebars.compile(notesTemplate, { noEscape: true });

    const pages = posts.map((post) => {
      post.reference = post.reference.replace("./docs/", "");
      post.contents = post.contents.slice(0, 110);
      return post;
    });

    await Deno.writeTextFile(
      "./docs/notes.html",
      body({ pages }),
    );
  } catch (e) {
    throw new Error(`failed to open file: ${e}}`);
  }
}

await cleanUp();
const posts = await generatePages();
await copyAssets();
await generateIndex(posts);
await generateNotes(posts);
