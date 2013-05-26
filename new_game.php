<?php

include 'dbconnect.php';
include 'validate_client.php';
global $mysqli, $response, $player, $playerID;

//add the game to the game table
$query = 'INSERT INTO RummyGame (Name,InProgress) VALUES ("' . $player . '", FALSE)';
if($mysqli->query($query) === FALSE) fail('Could not create game ' . $player);
$gameID = -1;
if(($result = $mysqli->query('SELECT ID FROM RummyGame WHERE Name="' . $player . '"')) !== FALSE
	and ($row = $result->fetch_row()) and $row[0] >= 0) $gameID = $row[0];
else fail('Could not retrieve game ID for game ' . $player);

//update this player to be the owner of this game
if($mysqli->query('UPDATE RummyPlayer SET GameID=' . $gameID . ' WHERE NickName="' . $player . '"') === FALSE)
	fail('Could not add player ' . $player . ' to game ' . $player);
if($mysqli->query('INSERT INTO RummyRole (GameID,Role,PlayerID) VALUES '
	. '('.$gameID.',"TURN",NULL),('.$gameID.',"WINNER",NULL),('.$gameID.',"OWNER","' . $player . '")') === FALSE)
	fail('Could not set player ' . $player . ' as owner of game ' . $player);

//stack the deck for this game
$cards = range(0, DECK_SIZE-1);
shuffle($cards);
foreach($cards as $card) {
	$query = 'INSERT INTO RummyDeck (GameID,CardID) VALUES (' . $gameID . ',' . $card . ')';
	if($mysqli->query($query) === FALSE) addResponse('Could not add card ' . $card);
}

addResponse('Game ' . $player . ' created');
succeed(array('success' => true));

?>