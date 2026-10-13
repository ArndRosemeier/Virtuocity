# Virtuocity manual

## What Virtuocity is

Virtuocity is a place where you and a cast of automated **actors** work together in a **session**. An actor can be a language model playing a character, a piece of plain code (a dice roller, a director that picks who speaks), an image model that paints, or anything else that can keep a clear promise to the others. You can be part of the session or just watch it run.

The app itself knows nothing about stories, books or games. Everything it does is built from three parts that you combine:

- **Skills** are what an actor can do: talk, paint, summarize, review, roll dice, direct. Skills come with the app.
- **Actors** are yours. You make an actor, give it skills and describe it. Actors live in your **Library** and can take part in any session.
- **Session types** say what kind of session it is: who is in the cast, which panels it shows and which roles its guide suggests. Every session has exactly one. A session type is itself an actor, so you can copy it and change it.

A roleplay is one session type: a narrator, maybe AI players, a director, a premise, an illustrator and a chronicler. A book room is another: a writer, a reviewer and you as editor. An image workflow is a third: you describe a picture and an illustrator paints it. A pen-and-paper game with dice or, later, a 3D world are further session types made from the same parts. When a new skill arrives, every session type can use it.

## Getting started

1. **Connect a provider.** Open Settings (the gear) › Connection and paste an API key for OpenRouter, OpenAI or Anthropic. Keys stay in this browser and are never saved to files.
2. **Pick default models.** Settings › Models sets one model per kind of output (text, image, decisions). Any actor can use a different one.
3. **Start a session.** Press New session (the circular arrow in the header), name it and pick a session type such as Roleplay, Image workflow, or Open (every panel, no suggestions).
4. **Add actors.** Use Add actor in the Cast panel. The session type's guide at the top of the Cast panel lists what it usually needs and ticks each role off as a matching actor joins.
5. **Play.** Write in the box at the bottom. Who answers depends on the session (see Turns below).

On a fresh start your Library already holds some ready-made actors: the Open, Roleplay, Book room and Image workflow session types and their usual cast (Narrator, Wren, Director, Ink, Chronicler, Premise, Quill, Marlow, Painter). They are ordinary actors: edit them, copy them or delete them.

## The screen

- **Header:** the version and What's new, this Manual, and the open session's name, which opens the session list. On the right are the cost so far, the model calls (for a look under the hood), the Library (bookmark), saving and loading a session file, New session, and Settings.
- **Main area:** what the session is about, such as the conversation or a manuscript. With several views you switch with tabs.
- **Input:** where you write, act or pass, and pick who speaks next.
- **Left sidebar (Spaces):** actors that show something beside the conversation, like a picture, a canvas, a list of facts or a summary.
- **Right sidebar:** the Cast, your tasks, background jobs and other panels.

Which of these a session shows is decided by its session type.

## Actors: one name, one actor

This is the most important idea in Virtuocity.

- **An actor's name is the actor.** There is exactly one Marlow. Two actors can never share a name, anywhere.
- **Every actor lives in your Library.** A session does not get its own copy of an actor. It only notes which Library actors take part.
- **Editing an actor changes it everywhere.** Change Marlow, and every session with Marlow, including old ones and templates, has the new Marlow. Going back in a session (retry, an earlier version) never brings back an older Marlow either.
- **Want a variation? Copy it under a new name.** "Marlow (young)" is a different actor with its own name, and from then on it is independent.
- **Deleting an actor deletes the sessions that use it.** Virtuocity warns you first and lists those sessions. Nothing is left referring to an actor that no longer exists.
- **Removing an actor from a session** is only possible before it has done anything there. Once it has acted, the session is part of its history.

### Making an actor

Open the Library and press New actor, or Copy on an existing one. Give it a name, tick its skills, and fill in what those skills ask for: a personality for actors that talk, settings for each skill (an illustrator's style, a premise's text), and models if it should not use the defaults. A new actor starts with no skills, so the editor only asks for what you pick. "Transform by AI" on long text fields turns a few words into a full description.

Whether an actor is in the **cast** depends on the session type, not on the actor: each type lists its cast skills. In a roleplay the actors who talk are the cast; in an image workflow the illustrators are. Every other actor in a session is a **support** actor (an illustrator in a roleplay, a chronicler, the session type itself). It works beside the session and never takes a turn, though some can be asked to act.

### Sessions from a file

A session saved to a file carries its actors with it, because the file has to work in another browser or for another person. When you load such a file:

- An actor whose name is new to you joins your Library.
- An actor that is exactly the same as yours is simply yours. Nothing is asked.
- An actor whose name you already have, but with different details, makes Virtuocity ask which version to keep: yours or the loaded one. Since a name is one actor, your choice applies everywhere, in every session.

## Session types

A session type is an actor with the Session type skill. Every session has exactly one, chosen when you start it. It stays for the life of the session: you can't remove it or swap it for another. It decides three things:

- **Cast skills:** which skills make an actor part of the cast, in order. An actor with one of them takes turns and acts with the first one it has. An illustrator that can also talk paints in an image workflow (cast skill Illustrator) and talks in a roleplay (cast skill Conversation).
- **Panels:** which panels the session shows, in which order. Book room shows the manuscript and no chat; Roleplay shows the spaces, the conversation and the input box. With no panels listed, a session shows everything.
- **Roles:** what the setup guide suggests adding, such as "A narrator" or "An illustrator". A role says what an actor must be able to do ("In the cast": one of the cast skills, or a contract such as director or reviewer), never which actor. Optional roles are listed as options.

A session type never adds actors itself; you do. To make your own, copy Roleplay under a new name and change its cast skills, roles and panels in the actor editor. An actor either is a session type or isn't: to make one, create a new actor with the Session type skill. If your Library has no session type left, New session asks you to make one first. A roleplay with dice, one without a director, or one with only players is just a different session type. Like any actor, editing a session type changes every session of that type, and deleting it deletes those sessions after a warning.

## Turns and directors

After every turn the session pauses. Without a director, nobody speaks on their own: you pick who speaks next under "Let speak". A session can have one **director**, an actor that picks the next speaker. With a director you can **Act** (write, then the director picks who answers) or **Pass** (the director picks without you writing). Support actors that can be asked, like an illustrator, appear under "or ask".

## Retry, versions and editing

- **Retry** lets an actor answer again. The old answer is kept: a retried message shows a picker like "‹ 2/3 ›". Going back to an earlier version brings back everything that followed it; anything new continues from the version you picked.
- **Edit** changes a message in place; everything after it stays. Click outside to save, or press Escape to drop the change.
- **Delete** takes one message out; everything after it stays.

## Spaces

Some actors have a space in the left sidebar: a picture, a canvas, a list of facts, a summary. Every space can be resized, closed and brought back, and its content can be deleted. Some spaces stay hidden until a marker in the conversation (like a chronicler's "summarized" line) opens them.

## Sessions and templates

- Every session has a unique name. Open the session list from the session name in the header to switch, rename or delete sessions.
- Tick **Template** on a session to list it under Templates. Using a template asks for a name and starts a new session from a copy of it, with everything it already holds; the template itself stays as it is.
- A session without a session type can't be opened: one saved by an older version is deleted, and a file without one is refused.

## What belongs to a session

The session holds what happened in it: messages, pictures, summaries, facts. You (the person writing) and the session's view (how it is drawn, for example Chat view or Roleplay view) belong to the session itself, not to the Library. Everything else, including every actor's settings, lives on the actors.

## Saving

Everything is kept in this browser automatically. Settings › Save & load saves everything to one file (without your API keys) or replaces everything with such a file. A single session can be saved to a file from the header.
