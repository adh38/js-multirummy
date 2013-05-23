<?php

include 'dbconnect.php';
include 'validate_client.php';
global $mysqli, $player, $playerID, $isOwner;

if(!$isOwner) fail('Only the game owner can respond to requests to join');

//determine whose request is being processed and whether they are being accepted or rejected
$requester = $_GET['name'];
$decision = $_GET['decision'];
if($decision === 'accept') $accept = true;
elseif($decision === 'reject') $accept = false;
else fail($decision . ' is not a valid decision - must be "accept" or "reject"');

//update the player table, which will notify the requester of the decision
$query = 'UPDATE RummyPlayer SET ' . ($accept ? 'GameID='.$gameID : 'GameRequest=NULL') . ' WHERE NickName="' . $requester . '"';
if($mysqli->query($query) === FALSE) fail('Could not update request for ' . $requester);

succeed(array('success' => true));

?>
