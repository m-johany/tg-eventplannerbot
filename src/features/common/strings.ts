export const STRINGS = {
  help: `🎉 *Event Planner Bot*\n\nCommands:\n/event _text_ — create event instantly\n/event new — step-by-step wizard\n/event edit _id_ — edit event\n/event cancel _id_ — delete event\n/events — list upcoming events\n/help — this message`,

  eventCreated: "✅ Event created!",
  eventCancelled: "🗑️ Event cancelled.",
  eventUpdated: "✏️ Event updated.",

  rsvpYes: "✅ I'm going",
  rsvpNo: "❌ I'm out",
  editEvent: "✏️ Edit",
  deleteEvent: "🗑️ Delete",

  wizardTitle: "Enter event name:",
  wizardDate: "Enter date and time (e.g. 2026-08-12 19:00):",
  wizardLocation: "Enter location (or /skip):",
  wizardCancelled: "Event creation cancelled.",

  rsvpAdded: (name: string) => `${name} is going!`,
  rsvpRemoved: (name: string) => `${name} is no longer going.`,

  noEvents: "No upcoming events.",
  eventListHeader: "*Upcoming Events:*\n\n",
  eventListItem: (n: number, title: string, date: string | null, count: number) =>
    `${n}. ${title}${date ? ` — ${date}` : ""} (${count} going)\n`,

  eventNotFound: "Event not found.",
  notCreator: "Only the event creator can do that.",
  adminOnly: "Only admins can create events.",
  groupOnly: "Events work in group chats only.",
  invalidDate: "Invalid date format. Try: YYYY-MM-DD HH:MM",
  somethingWentWrong: "Something went wrong. Please try again.",
} as const;
