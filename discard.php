<?php

include 'dbconnect.php';
include 'validate_client.php';
global $mysqli, $response, $player, $playerID, $gameID;

//make sure it is this player's turn
if(single('PlayerID', 'RummyRole', 'GameID='.$gameID.' AND Role="TURN"') !== $player) fail('It is not your turn, ' . $player);

//and that they actually have the card they want to discard
$card = $_GET['card'];
if(single('Pile', 'RummyDeck', 'GameID='.$gameID.' AND CardID='.$card) !== $player) fail('Player ' . $player . ' does not have card ' . $card);

//put the next available card into this player's hand
lock('RummyDeck', 'WRITE');
$nextCard = single('CardID', 'RummyDeck', 'GameID='.$gameID.' AND ISNULL(Pile) ORDER BY ID LIMIT 1');
if($nextCard !== NULL) {
	update('RummyDeck', 'Pile="<discard>"', 'GameID='.$gameID.' AND CardID='.$card);
	update('RummyDeck', 'Pile="'.$player.'"', 'GameID='.$gameID.' AND ISNULL(Pile) ORDER BY ID LIMIT 1');
}
else fail('No more cards to deal');
unlock();

//get the next player in the table, or first if there is no next
$nextID = single('MIN(ID)', 'RummyPlayer', 'GameID='.$gameID.' AND ID > '.$playerID);
if($nextID == NULL) $nextID = single('ID', 'RummyPlayer', 'GameID='.$gameID.' ORDER BY ID LIMIT 1');
if($nextID == NULL) fail('Could not get next player index');

//get the name of the next player
$nextPlayer = single('NickName', 'RummyPlayer', 'ID='.$nextID);
if($nextID < 0 or $nextPlayer == '') fail('Could not retrieve next player: ' . $nextID . ' = ' . $nextPlayer);//*/
addResponse('Next player = ' . $nextID . ' = ' . $nextPlayer);

//set the role table so it is their turn
update('RummyRole', 'PlayerID="'.$nextPlayer.'"', 'GameID='.$gameID.' AND Role="TURN"');

succeed(array('success' => true));

?>

