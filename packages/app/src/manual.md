# Virtuocity manual

## What Virtuocity is

Virtuocity is a place where you and a cast of automated **actors** work together in a **session**. An actor can be a language model playing a character, a piece of plain code (a dice roller, a director that picks who speaks), an image model that paints, or anything else that can keep a clear promise to the others. You can be part of the session or just watch it run.

The app itself knows nothing about stories, books or games. Everything it does is built from three parts that you combine:

- **Skills** are what an actor can do: talk, paint, summarize, review, roll dice, direct. Skills come with the app.
- **Actors** are yours. You make an actor, give it skills and describe it. Actors live in your **Library** and can take part in any session.
- **Session types** say what kind of session it is: who is in the cast, which panels it shows and which roles its guide suggests. Every session has exactly one. A session type is itself an actor, so you can copy it and change it.

A roleplay is one session type: a narrator, maybe AI players, a director, a premise, an illustrator and a chronicler. A book room is another: a writer, a reviewer and you as editor. An image workflow is a third: you describe a picture and an illustrator paints it. Guided illustrations puts a talking prompt refiner in between, who turns your words into a detailed prompt before the illustrator paints. Pathfinder 2e and D&D 5e are tabletop games: a game master runs the game by the system's rules and rolls real dice, you and AI players play characters. A 3D world could later be another session type made from the same parts. When a new skill arrives, every session type can use it.

## Getting started

1. **Connect a provider.** Open Settings (the gear) › Connection and paste an API key for OpenRouter, OpenAI or Anthropic. Keys stay in this browser and are never saved to files.
2. **Pick default models.** Settings › Models sets one model per kind of output (text, image, decisions). Any actor can use a different one.
3. **Start a session.** Press New session (the circular arrow in the header), name it and pick a session type such as Roleplay, Image workflow, or Open (every panel, no suggestions).
4. **Let the wizard set it up.** With "Guide me" ticked (the default), Next asks one question per role of the session type, such as "Who tells the story?". Each says how much it matters (needed, recommended or optional) and what you miss without it. Pick an actor from your Library, choose Nobody, or press Make a new one: the new-actor dialog opens with the skills that role needs already ticked. Start opens the session with everyone you picked.
5. **Add actors later.** Use Add actor in the Cast panel. The session type's guide at the top of the Cast panel lists what it usually needs and ticks each role off as a matching actor joins. It is a checklist you can close with ×; untick "Show a checklist…" in New session to start sessions without it (the choice is remembered).
6. **Play.** Write in the box at the bottom. Who answers depends on the session (see Turns below). The small field next to Act is your name (User until you change it): the AI actors see each line under its speaker's name, yours included, so pick one no actor has.

On a fresh start your Library already holds some ready-made actors: the Open, Roleplay, Book room, Image workflow, Guided illustrations, Pathfinder 2e and D&D 5e session types and their usual cast (Narrator, Wren, Director, Ink, Chronicler, Premise, Quill, Marlow, Painter, Prompt refiner, Brush, Gallery, Analytics, Game Master, Kira, Dungeon Master, Bram). They are ordinary actors: edit them, copy them or delete them. When a new version improves them, Settings › Save & load › Update default actors sets them back to how the app ships them now (your changes to them are lost, deleted ones come back, other actors stay).

## The screen

- **Header:** the version and What's new, this Manual, and the open session's name, which opens the session list. On the right are the cost so far, the model calls (for a look under the hood), the Library (bookmark), saving and loading a session file, Clear session (the eraser), New session, and Settings.
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
- **Removing an actor from a session** is clean as long as the session hasn't gone on from what it did: whatever it did (a premise it posted, say) goes with it. Once others have acted after it, the session is part of its history, and removing it means deleting the session.

### Making an actor

Open the Library and press New actor, or Copy on an existing one. Give it a name, tick its skills, and fill in what those skills ask for: a personality for actors that talk, settings for each skill (an illustrator's style, a premise's text), and models if it should not use the defaults. A new actor starts with no skills, so the editor only asks for what you pick. "Transform by AI" on long text fields turns a few words into a full description.

A premise opens a session right before its first step: your first message, or the first time any actor acts. Until then the chat stays empty and the premise isn't part of the session yet, so you can still edit the premise actor (or swap it) and the session opens with what it says then. Once the session has begun, editing its text no longer changes it. With "Show the premise in the chat" off, you never see it, but the AI actors do: they get it marked as hidden from you, with the request to build on it and not give it away.

Whether an actor is in the **cast** depends on the session type, not on the actor: each type lists its cast contracts. In a roleplay the actors who talk (speakers) are the cast; in an image workflow the illustrators are. Every other actor in a session is a **support** actor (an illustrator in a roleplay, a chronicler, the session type itself). It works beside the session and never takes a turn, though some can be asked to act. The Cast panel lists the cast, then the support actors; below them, the session type and the session view each have a field of their own, since every session has exactly one of each. The view can be swapped there; the type stays for good, and both open in the actor editor.

### Sessions from a file

A session saved to a file carries its actors with it, because the file has to work in another browser or for another person. When you load such a file:

- An actor whose name is new to you joins your Library.
- An actor that is exactly the same as yours is simply yours. Nothing is asked.
- An actor whose name you already have, but with different details, makes Virtuocity ask which version to keep: yours or the loaded one. Since a name is one actor, your choice applies everywhere, in every session.

## Session types

A session type is an actor with the Session type skill. Every session has exactly one, chosen when you start it. It stays for the life of the session: you can't remove it or swap it for another. It decides three things:

- **Cast contracts:** what an actor must be able to do to be part of the cast, in order, such as speaker or illustrator. An actor serving one of them takes turns and acts with the first one it serves. An illustrator that can also talk paints in an image workflow (cast contract illustrator) and talks in a roleplay (cast contract speaker). The cast is never picked by a skill's name, so any skill that can speak takes part wherever speakers are cast.
- **Panels:** which panels the session shows, in which order. Book room shows the manuscript and no chat; Roleplay shows the spaces, the conversation and the input box. With no panels listed, a session shows everything.
- **Roles:** what the setup wizard asks for and the guide suggests, such as "A narrator" or "An illustrator". A role says what an actor must be able to do ("In the cast": one of the cast contracts, or another contract such as director or reviewer), never which actor. Each role also has an importance (needed, recommended or optional), a line on what the session lacks without it ("Without it"), and the question the wizard asks. The wizard knows nothing else about the kind of session: everything it asks comes from these roles.

A session type never adds actors itself; you do. To make your own, copy Roleplay under a new name and change its cast contracts, roles and panels in the actor editor. An actor either is a session type or isn't: to make one, create a new actor with the Session type skill. If your Library has no session type left, New session asks you to make one first. A roleplay with dice, one without a director, or one with only players is just a different session type. Like any actor, editing a session type changes every session of that type, and deleting it deletes those sessions after a warning.

## Tabletop games

The PF2E GM, PF2E Player, D&D 5 classic GM and D&D 5 classic Player skills turn a talking actor into a seat at a tabletop game. Give an actor Conversation and one of them. The skill tells that actor's model the system's rules and its part at the table (only that actor's: the others don't see it), and gives it three tools: roll a check (d20 + bonus against a DC, with advantage or disadvantage, and the outcome by the rules, such as Pathfinder's four degrees of success), find the DC for a task, and work out a proficiency bonus. Rolls are real and show up in the conversation. Each skill has a House rules field for variants your table plays with.

A player actor's description is its character: ancestry, class, level, scores, bonuses and personality, like Kira's or Bram's. The Pathfinder 2e and D&D 5e session types only suggest a game master and players of their own system. D&D 5 classic means the 2014 rules.

## Turns and directors

After every turn the session pauses. Without a director, nobody speaks on their own: you pick who speaks next under "Let speak". A session can have one **director**, an actor that picks the next speaker. With a director you can **Act** (write, then the director picks who answers) or **Pass** (the director picks without you writing). Support actors that can be asked, like an illustrator, appear under "or ask". Some support actors also act on their own, with or without a director: a chronicler summarizes when the session grows, and an illustrator with "Paint on its own" switched on paints after every turn. That setting is off by default, since pictures cost money.

To take an actor out of the director's choices for a while, click the pause button next to it in the Cast panel. A paused actor stays in the session and you can still let it speak yourself; the director just doesn't see it until you click play. Pausing belongs to the session, not the actor: the same actor in another session is not paused. Like joining, a pause is part of the session's history, so going back to a point before it (a retry, an older version) undoes it.

## Retry, versions and editing

- **Retry** lets an actor answer again. The old answer is kept: a retried message shows a picker like "‹ 2/3 ›". Going back to an earlier version brings back everything that followed it; anything new continues from the version you picked.
- **Edit** changes a message in place; everything after it stays. Click outside to save, or press Escape to drop the change.
- **Delete** takes one message out; everything after it stays.

## Spaces

Some actors have a space in the left sidebar: a picture, a canvas, a list of facts, a summary. Every space can be resized, closed and brought back, and its content can be deleted. Some spaces stay hidden until a marker in the conversation (like a chronicler's "summarized" line) opens them.

An **Analytics** actor (the Session analytics skill) shows how long the session is (posts, words, characters, an estimate of the tokens a model reads, words per speaker, how many markers such as Summarized) and, below that, the whole session as a strip of thin colored lines, one per post: your text, AI text, pictures, sound, tool use, posts hidden from you, and anything else each get their own color (the legend underneath names them). Markers, such as a chronicler's "Summarized", show as thin red dividers where they fall, so you see where the last summary is. Click a line to jump to that post in the session; clicking a marker also opens its actor's space. It updates when you click it under "or ask:" or press Retry in its space; switch on "automatic" in the actor editor to have it update after every post and whenever background work (like a new summary) finishes.

## Pictures and the gallery

A session can hold many pictures, so one of them is always **the current picture**: the one everyone works on. A **Gallery** actor decides which. Its space shows the current picture with "‹ 2/5 ›" to step back and forth; maximized, it shows the current picture on one half and every other picture as thumbnails you click. A new picture becomes current as soon as it arrives. A session has at most one gallery. Illustrators have no space of their own: every picture they paint is posted into the session, where Retry and Delete work as on any message; add a gallery to browse them. Any space that shows a picture has Copy (to the clipboard) and Save (to a file) buttons in its header.

A talking model sees the current picture itself, and every other picture as a numbered line such as "[Picture 2: a fox in the snow]", so you can say "go back to picture 2". Models that can't see pictures get only the descriptions.

A talking image model (one that both writes and paints, like Nano Banana) needs only the Conversation skill: the pictures it draws while talking land in the conversation as pictures. Give it a gallery, and it sees the picture you want changed.

## Sessions and templates

- Every session has a unique name. Open the session list from the session name in the header to switch, rename or delete sessions.
- **Clear session** (the eraser in the header) empties the open session after a warning: everything that happened goes, every version included, while its cast and setup stay. The next step starts it afresh, so a premise opens it again as it is then.
- Tick **Template** on a session to list it under Templates. Using a template asks for a name and starts a new session from a copy of it, with everything it already holds; the template itself stays as it is.
- A session without a session type can't be opened: one saved by an older version is deleted, and a file without one is refused.

## What belongs to a session

The session holds what happened in it: messages, pictures, summaries, facts. You (the person writing) and the session's view (how it is drawn, for example Chat view or Roleplay view) belong to the session itself, not to the Library. Everything else, including every actor's settings, lives on the actors.

## Saving

Everything is kept in this browser automatically. Settings › Save & load saves everything to one file (without your API keys) or replaces everything with such a file. A single session can be saved to a file from the header.

To see exactly what went to a model and what came back, Settings › Connection › Show prompt log lists the last 5 model calls of this tab, raw. It is always on, forgets everything on reload and never shows your keys.
