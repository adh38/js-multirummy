<?php

include 'dbconnect.php';
include 'validate_client.php';
global $mysqli, $response, $player, $playerID;

$game = $_GET['game'];
if(($result = $mysqli->query('SELECT ID FROM RummyGame WHERE Name="' . $game . '"')) !== FALSE
	and ($row = $result->fetch_row()) and $row[0] >= 0) $gameID = $row[0];
else fail('Could not get game ID for game ' . $game);

if($mysqli->query('UPDATE RummyPlayer SET GameRequest=' . $gameID . ' WHERE ID=' . $playerID) === FALSE)
	fail('Could not update request for player ' . $playerID . '=' . $player . ' to game ' . $gameID . '=' . $game);
succeed(array('success' => true));

?>
