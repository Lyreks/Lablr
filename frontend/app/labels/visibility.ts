import type { LabelListVisibility, MessageListVisibility } from "./api";

type Option<T> = { value: T; text: string };

export const labelListVisibility = {
  title: "In sidebar",
  help:
    "Whether the label is listed in Gmail's left sidebar. \"Show if unread\" lists it only " +
    "while it has unread mail. Hidden labels are still under \"More\".",
  options: [
    { value: "labelShow", text: "Show" },
    { value: "labelShowIfUnread", text: "Show if unread" },
    { value: "labelHide", text: "Hide" },
  ] satisfies Option<LabelListVisibility>[],
};

export const messageListVisibility = {
  title: "On emails",
  help:
    "Whether the label's tag appears next to email subjects in your inbox and other lists. " +
    "Hiding the tag doesn't hide the emails.",
  options: [
    { value: "show", text: "Show" },
    { value: "hide", text: "Hide" },
  ] satisfies Option<MessageListVisibility>[],
};

// A parent's sidebar visibility applies to its whole branch (verified in Gmail):
// - Hide hides the children too.
// - Show if unread shows the branch only while something in it is unread.
// Message-list visibility isn't inherited.
export type SidebarRestriction = { ancestor: string; hidden: boolean };

// Lookup for the most limiting ancestor: the closest hidden one, else the closest
// "show if unread" one.
export function sidebarRestrictionLookup(
  labels: { name: string; labelListVisibility: LabelListVisibility | null }[],
) {
  const visibility = new Map(labels.map((label) => [label.name, label.labelListVisibility]));
  return (name: string): SidebarRestriction | null => {
    let ifUnread: string | null = null;
    const parts = name.split("/");
    for (let i = parts.length - 1; i > 0; i--) {
      const ancestor = parts.slice(0, i).join("/");
      const setting = visibility.get(ancestor);
      if (setting === "labelHide") return { ancestor, hidden: true };
      if (setting === "labelShowIfUnread" && ifUnread === null) ifUnread = ancestor;
    }
    return ifUnread === null ? null : { ancestor: ifUnread, hidden: false };
  };
}

export const sidebarRestrictionText = ({ ancestor, hidden }: SidebarRestriction) =>
  hidden
    ? `Hidden from the sidebar because "${ancestor}" is hidden.`
    : `Only in the sidebar while "${ancestor}" or a label inside it has unread mail, ` +
      `because "${ancestor}" is set to show if unread.`;

export function optionText(options: { value: string; text: string }[], value: string | null) {
  return options.find((option) => option.value === value)?.text ?? "—";
}
