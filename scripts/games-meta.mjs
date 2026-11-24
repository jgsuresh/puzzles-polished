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
  {
    name: 'go',
    title: 'Go',
    description: 'Surround more of the board than your opponent. Simple rules, endless depth.',
    objective: 'Control more points than your opponent: your stones plus the empty areas only you surround. White gets komi to offset moving second.',
    rules: `<p>Players take turns placing a stone on an empty intersection (Black first), or passing. Stones never move once placed.</p>
<p><strong>Capture.</strong> A group of connected stones is captured and removed when it has no empty point next to it (no "liberties"). You may not play a move that leaves your own group with no liberties unless it captures, and you may not recreate a whole-board position that has occurred before (the ko rule).</p>
<p><strong>Ending.</strong> The game ends when both players pass in a row. Each side scores its stones plus every empty region touched only by its stones. White also receives komi (a few extra points). Highest score wins. This game does not mark dead stones for you, so capture anything you think is dead before you pass.</p>
<p>Tip: stones near the edge are weak; the corners are the best place to start.</p>`,
  },
  {
    name: 'gonnect',
    title: 'Gonnect',
    description: 'Go with captures, but no passing: win by linking two opposite sides.',
    objective: 'Make one chain of your stones that connects two opposite sides of the board (left to right, or top to bottom).',
    rules: `<p>Gonnect uses the rules of Go: place a stone on an empty point, groups with no liberties are captured, suicide is illegal and so is repeating an earlier position. Two things change: <strong>nobody may pass</strong>, and the goal is not territory.</p>
<p>You win by building a chain of connected stones that touches two opposite sides of the board (either pair). You also win if your opponent has no legal move. There are no draws.</p>
<p><strong>Pie rule.</strong> After Black's first move, White may press <em>Swap</em> to take that stone as their own (switching sides) instead of playing.</p>
<p>Tip: a chain that cannot be captured is worth more than a long one.</p>`,
  },
  {
    name: 'loa',
    title: 'Lines of Action',
    description: 'Slide your pieces together into one connected group.',
    objective: 'Connect all of your pieces into a single group (touching sides or corners).',
    rules: `<p>Black holds the top and bottom rows, White the left and right columns, and Black moves first.</p>
<p>On your turn, move one piece in a straight line (across, down or diagonally) by exactly as many squares as there are pieces, of either colour, anywhere on that whole line. You may jump over your own pieces but not over enemy pieces. You may land on an empty square or on an enemy piece, which is captured and removed; you may not land on your own piece.</p>
<p>You win when all your pieces form one connected group (squares touching by side or corner). If a move connects both sides at once, the player who moved wins.</p>`,
  },
  {
    name: 'slimetrail',
    title: 'Slimetrail',
    description: 'Push one shared token toward your goal corner; every cell it leaves is blocked.',
    objective: 'The token is shared. Win by getting it into your own goal corner, or lose it to your opponent\'s.',
    rules: `<p>One token starts in the middle of a diamond of hexagons. The two obtuse corners are goals: the Red goal is the top-right corner and the Blue goal is the bottom-left corner.</p>
<p>On your turn, move the token to a neighbouring cell that hasn't been used. The cell it leaves is blocked for good, leaving a slime trail. You are not allowed to make a move after which no goal could ever be reached.</p>
<p>The player whose goal the token enters wins, <em>whoever moved it there</em>. If the token gets stuck anywhere else, the game is a draw. The dots show where you may move.</p>`,
  },
  {
    name: 'epaminondas',
    title: 'Epaminondas',
    description: 'Advance phalanxes of stones, capture smaller ones, and break through to the far row.',
    objective: 'At the start of your turn, have more stones on the enemy back row than they have on yours.',
    rules: `<p>Each side starts with two full rows of stones. A <strong>phalanx</strong> is a straight, unbroken line of your stones (across, down or diagonally); a single stone is a phalanx of one.</p>
<p><strong>Moving.</strong> A phalanx moves forwards or backwards <em>along its own line</em>, never sideways, up to as many squares as it has stones. You may also move just part of a phalanx (a shorter unbroken run), and then the limit is the number of stones you move. A single stone can step one square in any of the eight directions. Stones cannot jump over anything.</p>
<p><strong>Capturing.</strong> If a moving phalanx runs into an enemy phalanx that is <em>smaller</em> than itself, along the direction of travel, it captures that whole enemy line and lands on its first square. Larger or equal lines block you.</p>
<p><strong>Winning.</strong> The tinted rows are the goals. If, when your turn begins, you have more stones on your opponent's back row than they have on yours, you win.</p>
<p>How to play it here: tap a stone to select it, or tap two stones to select the run between them. The dots show where it can land (rings mean a capture), tap one to move. The 10 × 8 board is a smaller variant we added for phones.</p>`,
  },
  {
    name: 'nex',
    title: 'Nex',
    description: 'Hex with shared neutral stones that either player can turn to their side.',
    objective: 'Red joins the top and bottom edges; Blue joins the left and right edges, with an unbroken chain of their own stones.',
    rules: `<p>Nex is played on a Hex board with a pool of <strong>neutral</strong> stones that belong to neither player. On your turn you do <em>one</em> of these:</p>
<ul><li><strong>Drop two stones:</strong> place one stone of your colour and one neutral stone, on two empty hexagons.</li>
<li><strong>Convert:</strong> turn two neutral stones into your colour, and turn one of your own stones into a neutral stone.</li></ul>
<p>Either way you end up with exactly one more stone of your colour, so both players always have the same number after each full round. Neutral stones don't count for anyone's chain.</p>
<p>Red wants a chain joining the top and bottom edges; Blue wants a chain joining left and right. If the board is nearly full, a single stone is placed or converted instead, which ends the game.</p>
<p>How to play it here: to drop, tap an empty cell (your stone), then another empty cell (the neutral stone). To convert, tap two neutral stones, then one of your stones.</p>`,
  },
];
