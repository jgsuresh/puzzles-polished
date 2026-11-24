// Catalogue of the two-player (pass-and-play) games. Rules are written in our own words.
// `swap` explains the pie rule where a game offers it.
const SWAP = '<p><strong>Swap rule (optional).</strong> To keep the first move fair, you can turn on the swap rule in the options: after the first stone is placed, the second player may press <em>Swap</em> to take that stone as their own instead of playing a move.</p>';

export const GAMES = [
  {
    name: 'hex',
    title: 'Hex',
    description: 'Link your two sides of the board before your opponent links theirs.',
    objective: 'Red joins the top and bottom edges; Blue joins the left and right edges, with an unbroken chain of stones.',
    rules: `<p>Players take turns placing one stone of their colour on any empty hexagon. Stones never move and are never captured.</p>
<p>Red wants a chain of touching red stones from the top edge to the bottom edge. Blue wants a chain of blue stones from the left edge to the right edge. Because the board is a rhombus, exactly one player will always manage it, so there are no draws.</p>${SWAP}
<p>Tip: the middle of the board is powerful, and a pair of stones one "bridge" apart is as good as touching, because your opponent cannot cut both gaps.</p>`,
  },
  {
    name: 'y',
    title: 'Y',
    description: 'Connect all three sides of a triangular board with a single chain.',
    objective: 'Make one connected group of your stones that touches all three sides of the triangle (corners count for both neighbouring sides).',
    rules: `<p>Players take turns placing a stone on any empty hexagon of the triangular board. Stones never move.</p>
<p>You win as soon as one connected group of your stones touches all three sides. Corner hexagons count as part of both sides they touch. Like Hex, Y can never end in a draw: whoever fills the board's last gap, exactly one player has a Y.</p>${SWAP}
<p>Tip: the centre of the triangle is the strongest area, since it is closest to all three sides.</p>`,
  },
  {
    name: 'havannah',
    title: 'Havannah',
    description: 'Win with a ring, a bridge between corners, or a fork between three sides.',
    objective: 'Complete a ring, a bridge (connect two corners) or a fork (connect three different sides) with your stones.',
    rules: `<p>Players take turns placing a stone on any empty hexagon. Stones never move. You win by completing any one of three shapes with a connected group of your stones:</p>
<ul><li><strong>Ring:</strong> a loop that surrounds at least one hexagon (empty or not).</li>
<li><strong>Bridge:</strong> a chain linking any two of the six corners.</li>
<li><strong>Fork:</strong> a chain touching three different sides (corners do not count as sides).</li></ul>
<p>If the board fills up with no winner the game is a draw.</p>${SWAP}`,
  },
  {
    name: 'gomoku',
    title: 'Gomoku',
    description: 'Get five in a row, in any direction, before your opponent does.',
    objective: 'Place five or more stones of your colour in an unbroken line: across, down or diagonally.',
    rules: `<p>Players take turns placing a stone on an empty intersection. Black goes first. Stones never move and are never captured.</p>
<p>The first player to make an unbroken line of five or more of their own stones, horizontally, vertically or diagonally, wins. If the board fills up first, it is a draw.</p>
<p>Tip: an "open three" (three in a row with space at both ends) forces a reply, and two threats at once usually wins.</p>`,
  },
  {
    name: 'reversi',
    title: 'Reversi',
    description: 'Outflank your opponent\'s discs to flip them; most discs at the end wins.',
    objective: 'When no more moves are possible, have more discs of your colour than your opponent.',
    rules: `<p>The game starts with two black and two white discs in the middle. Black moves first.</p>
<p>On your turn, place a disc on an empty square so that it traps one or more straight lines of your opponent's discs between the new disc and another of your own (in any of the eight directions). All trapped discs flip to your colour. The small dots show where you may play.</p>
<p>If you have no legal move you must pass, and the game does that for you. The game ends when neither player can move, and the player with more discs wins.</p>
<p>Tip: corners can never be flipped, so they are very valuable.</p>`,
  },
  {
    name: 'amazons',
    title: 'Amazons',
    description: 'Move a queen, then shoot an arrow. Walls grow until someone is trapped.',
    objective: 'Leave your opponent with no legal move.',
    rules: `<p>Each player has four queens. White moves first. A turn has two steps:</p>
<ol><li><strong>Move</strong> one of your queens any distance in a straight line (across, down or diagonally), without jumping over or landing on a queen or an arrow.</li>
<li><strong>Shoot</strong> an arrow from the square the queen landed on, in any straight line, the same way. The arrow burns the square where it lands, and nothing can enter or cross it for the rest of the game.</li></ol>
<p>Tap a queen, then a highlighted square to move it, then a highlighted square for the arrow. Tap the queen's new square to take the move back. The first player who cannot move loses.</p>
<p>Tip: it is a territory game. Use arrows to wall off a big region for your own queens.</p>`,
  },
];
