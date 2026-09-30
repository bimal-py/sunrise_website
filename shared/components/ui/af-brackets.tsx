/**
 * The autofocus brackets from the splash and the secondary button, for cards:
 * four gold corners that snap onto a card (with a little overshoot) when it's
 * pointed at or its link has keyboard focus, like the camera locking focus on
 * what you're about to open. Put it inside a positioned element and give the
 * card (the hover target) the `af-card` class; the brackets sit just outside
 * the element's corners (globals.css "Autofocus brackets").
 */
export function AfBrackets() {
  return (
    <span aria-hidden className="af-brackets">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
