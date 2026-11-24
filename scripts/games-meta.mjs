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
  {
    name: 'campaign',
    title: 'Campaign',
    description: 'Hop your Knight around leaving a trail of markers: five in a row wins.',
    objective: 'Line up five of your markers in a row (across, down or diagonally), or leave your opponent\'s Knight with nowhere to go.',
    rules: `<p>Each player has a single chess Knight. To start, Red drops their Knight on any empty square, then Blue drops theirs.</p>
<p>After that, on your turn you must jump your Knight like a chess knight (two squares one way, one square at right angles) onto an empty square. The square it leaves is marked with a marker in your colour, and markers block both players forever, so the board slowly fills with trails.</p>
<p>You win by making a line of five of your own markers, across, down or diagonally. If your Knight has no legal jump on your turn, you lose. The dots show where your Knight can land.</p>
<p>Note: the original description leaves a few details open; here the Knight itself does not count towards a line (only markers do), and drops can go on any empty square.</p>`,
  },
  {
    name: 'jade',
    title: 'Jade',
    description: 'Drop white or black stones. One of you needs a four-sided link, the other a pair of parallel chains.',
    objective: 'Cross: one group of either colour touching all four edges. Parallel: a white chain and a black chain, each joining the same pair of opposite edges.',
    rules: `<p>The board is a diamond of hexagons. On your turn you drop <em>one stone on an empty hexagon, and you choose whether it is white or black</em>, whichever suits you. Stones never move. Cross goes first.</p>
<ul><li><strong>Cross</strong> wins when a single connected group, of either colour, touches all four edges of the board.</li>
<li><strong>Parallel</strong> wins when a white chain and a black chain both join the same pair of opposite edges (both top-to-bottom, or both left-to-right).</li></ul>
<p>Either player's stones can complete either goal. If a move completes both, the player who moved wins. If the board fills up with no winner, it is a draw.</p>
<p>How to play it here: tap a square to preview a white stone, tap the same square again to switch it to black, then press Confirm.</p>`,
  },
];

// Games from the book's two-player list that are not playable yet: the author's rules page either gives no
// rules text, or leaves out the starting position / board, which is only shown in an image.
export const SOON = [
  { name: 'aboyne', title: 'Aboyne', designer: 'Paul Sijben, 1995',
    known: 'A 5 × 5 hexagonal-board game. Each turn you step a stone to an adjacent empty cell, or jump over a line of your own stones. A stone next to an enemy stone is blocked. You win by reaching your goal cell or by leaving your opponent with no move.',
    missing: 'The starting position and the goal-cell locations are only shown in a diagram.' },
  { name: 'anchor', title: 'Anchor', designer: 'Steven Meyers, 2000',
    known: 'An 8 × 8 hexagonal-board territory game where stones that are not part of an "anchor" (a group touching three or more sides) die at the end. Players drop stones or pass, and the pie rule decides sides.',
    missing: 'Which corners count as "home" and "away", and the exact meaning of the symmetric-play rule.' },
  { name: 'annuvin', title: 'Annuvin', designer: 'Jeff Roy, 2001',
    known: 'A capture game on a 4 × 4 hexagonal board where each side has six stones. A stone can move as many spaces as 7 minus the number of stones you have left, so the last stone moves farthest. You win by capturing everything.',
    missing: 'The starting setup is only shown in a diagram.' },
  { name: 'dispatch', title: 'Dispatch', designer: 'João Pedro Neto, 2002',
    known: 'A 13 × 13 territory game: you send a stone in a straight line from one of yours, and where it stops it grows a domino, tromino, tetromino or pentomino. Groups without liberties are captured.',
    missing: 'The starting position and exactly how the new shape is attached to the stone that stopped.' },
  { name: 'stooges', title: '3 Stooges', designer: 'Jorge Nuno Silva, 2003',
    known: 'A "towers" game where you swap the colour of lone stones or move the top stone of a two-stone stack onto a neighbouring lone stone. You win with three stacks in a row, or by stalemating your opponent.',
    missing: 'The board and the starting stacks are only shown in an image.' },
  { name: 'gogol', title: 'Gogol', designer: 'Gustav Levay, 2002',
    known: 'An 8 × 8 game with pawns that can jump to any empty square and a King that slides like a chess queen. Pieces capture by jumping over an adjacent enemy. Capture the enemy King, or reach the far row with yours.',
    missing: 'The starting arrangement: the sources we found disagree on where the Kings start.' },
  { name: 'hobbes', title: 'Hobbes', designer: 'Dan Troyka, 2002',
    known: 'A 5 × 5 game inspired by Neutron. Each turn you walk your King one or more steps, then you must either capture the enemy King or push or pull an adjacent soldier. Capturing the King wins.',
    missing: 'The starting position is only shown in a diagram, and a few push/pull edge cases are not spelled out.' },
  { name: 'intersections', title: 'Intersections', designer: 'João Pedro Neto',
    known: 'It is on the book\'s list of two-player games.',
    missing: 'We could not find a written description of the rules, only a printable board.' },
  { name: 'iqishiqi', title: 'Iqishiqi', designer: 'João Pedro Neto, 2003',
    known: 'A hexagonal-board game with one shared neutral stone. You drop a stone that joins a group, and the neutral stone then slides away from that group by the group\'s size. Get it onto an edge you own to win.',
    missing: 'The board size and shape are only shown in an image, and a few counting details are ambiguous.' },
  { name: 'nosferatu', title: 'Nosferatu', designer: 'Chris Huntoon, 2001',
    known: 'Twelve Villagers and five Vampires face one powerful Nosferatu on a hexagonal board. Pieces capture by jumping, and the Nosferatu can turn Villagers into Vampires. Capture all the Villagers, or capture the Nosferatu.',
    missing: 'The board size (the sources we found disagree) and who moves first.' },
  { name: 'pawns', title: 'Pawns', designer: 'João Pedro Neto',
    known: 'It is on the book\'s list of two-player games.',
    missing: 'We could not find a written description of the rules, only a printable board.' },
  { name: 'sanqi', title: 'SanQi', designer: 'L. Lynn Smith, 2003',
    known: 'A three-colour hex-board game: you drop a stone of any colour, or replace a stone that is outnumbered by at least two to one by a neighbouring colour. The players aim for different shapes of six.',
    missing: 'Precise definitions of the winning "circle", "triangle" and "line", and the board size.' },
  { name: 'trafficlights', title: 'Traffic Lights', designer: '',
    known: 'It is on the book\'s list of two-player games, probably related to the three-in-a-row game of the same name on a small board.',
    missing: 'The author\'s page has only a printable board, and other sources describe different versions of the rules.' },
  { name: 'un', title: 'UN', designer: 'João Pedro Neto, 2003',
    known: 'Players take turns sliding a single neutral stone any distance in a straight line over empty cells; every cell it passes is used up. The first player who cannot move loses.',
    missing: 'The board is only shown in an image.' },
];
