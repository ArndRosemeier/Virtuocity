# Virtuocity manual

Virtuocity lets several actors, AI and human, work together in a session. A roleplay is one kind of session; a book with an outliner, an editor and a writer is another. A few ideas here work differently from other apps, so they are explained first.

## Actors: one name, one actor

This is the most important idea in Virtuocity.

- **An actor's name is the actor.** There is exactly one Marlow. Two actors can never share a name, anywhere.
- **Every actor lives in your Library.** A session does not get its own copy of an actor. It only notes which Library actors take part.
- **Editing an actor changes it everywhere.** Change Marlow, and every session with Marlow, including old ones and templates, has the new Marlow. Going back in a session (retry, an earlier version) never brings back an older Marlow either.
- **Want a variation? Copy it under a new name.** "Marlow (young)" is a different actor with its own name, and from then on it is independent.
- **Deleting an actor deletes the sessions that use it.** Virtuocity warns you first and lists those sessions. Nothing is left referring to an actor that no longer exists.
- **Removing an actor from a session** is only possible before it has done anything there. Once it has acted, the session is part of its history.

### Sessions from a file

A session saved to a file carries its actors with it, because the file has to work in another browser or for another person. When you load such a file:

- An actor whose name is new to you joins your Library.
- An actor that is exactly the same as yours is simply yours. Nothing is asked.
- An actor whose name you already have, but with different details, makes Virtuocity ask which version to keep: yours or the loaded one. Since a name is one actor, your choice applies everywhere, in every session.

### What belongs to a session

You (the person writing) and the session's view (how it is drawn, e.g. Chat view or Roleplay renderer) belong to the session itself, not to the Library. Changing the view of one session changes only that session.

## Skills and actors

Skills are what actors can do: talk, draw pictures, summarize, direct who speaks next. Skills are fixed and come with the app. Actors are yours: you make an actor, give it skills and describe it. A new actor starts with no skills.

An actor without a talking skill is a support actor (an illustrator, a chronicler). It works beside the conversation and never speaks in it.

## Session types

Roleplay and Book room are not built into the app: each is a **session type**, an actor in your Library with the Session type skill. A session type decides which panels a session shows and which roles its guide suggests (a narrator, a director, a reviewer...). It never adds anyone; you add actors yourself.

- **New session** lists the session types in your Library. The one you pick joins the session as a support actor; a session has at most one.
- **Make your own** like any actor: copy Roleplay under a new name and change its roles and panels in the actor editor, or create an actor with the Session type skill. A roleplay with dice, without a director, or only players is just a different session type.
- **Editing a session type changes every session of that type**, and deleting it deletes those sessions, after a warning, as with any actor.

## Sessions and templates

- Every session has a unique name. Open the session list from the session name in the header to switch, rename or delete sessions.
- Tick **Template** on a session to list it under Templates. Using a template asks for a name and starts a new session from a copy of it; the template itself stays as it is.

## Turns and directors

Without a director, nobody speaks on their own: you pick who speaks next under "Let speak". A session can have one director, an actor that picks the next speaker for you.

## Retry, versions and editing

- **Retry** lets an actor answer again. The old answer is kept: a retried message shows a picker like "‹ 2/3 ›". Going back to an earlier version brings back everything that followed it; anything new continues from the version you picked.
- **Edit** changes a message in place; everything after it stays. Click outside to save, or press Escape to drop the change.
- **Delete** takes one message out; everything after it stays.

## Spaces

Some actors have a space in the left sidebar: a picture, a canvas, a list of facts, a summary. Every space can be resized, closed and brought back, and its content can be deleted.

## Saving

Everything is kept in this browser automatically. Settings › Save & load saves everything to one file (without your API keys) or replaces everything with such a file. A single session can be saved to a file from the header.
