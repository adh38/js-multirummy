<?php

//since all server events will include this module, set up game-wide globals here
define('HAND_SIZE', 7);
define('DECK_SIZE', 52);
$suits = array('Clubs', 'Spades', 'Diamonds', 'Hearts');
$numbers = array('Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace');

//to be used by clients who hit an error - set unlock if there are still locked tables we should try to unlock
function fail($msg, $unlock = false) {
	global $mysqli, $response, $result;
	$response .= $msg . PHP_EOL;
	echo json_encode(array('failure' => true, 'response' => $response));
	if($result !== null and get_class($result) === 'mysqli_result') $result->free();
	if($unlock) $mysqli->query('UNLOCK TABLES');
	$mysqli->close();
	exit();
}
//to be used by clients to exit with data
function succeed($data, $unlock = false) {
	global $mysqli, $response, $result;
	echo json_encode(array_merge(array('response' => $response), $data));
	if($result !== null and get_class($result) === 'mysqli_result') $result->free();
	if($unlock) $mysqli->query('UNLOCK TABLES');
	$mysqli->close();
	exit();
}
//to be used by clients to add to the response
function addResponse($line) {
	global $response;
	$response .= $line . PHP_EOL;
}
$response = '';

//retrieve a single table cell - if fail is set, the whole script will abort if the query fails
function single($select, $from, $where, $fail = true) {
	global $mysqli;
	$query = 'SELECT '.$select.' FROM '.$from.' WHERE '.$where;
	if(($result = $mysqli->query($query)) !== FALSE and ($row = $result->fetch_row()))
		return $row[0];
	elseif($fail) fail('Query failed: ' . $query, true);
}
//multiple assumes multiple rows but only one column - use multiple_list for multiple columns
function multiple($select, $from, $where, $fail = true) {
	global $mysqli;
	$query = 'SELECT '.$select.' FROM '.$from.' WHERE '.$where;
	$ret = array();
	if(($result = $mysqli->query($query)) !== FALSE) {
		while($row = $result->fetch_row()) {
			$ret[] = $row[0];
		}
		return $ret;
	}
	elseif($fail) fail('Query failed: ' . $query, true);
}
function multiple_list($select, $from, $where, $fail = true) {
	global $mysqli;
	$query = 'SELECT '.$select.' FROM '.$from.' WHERE '.$where;
	$ret = array();
	if(($result = $mysqli->query($query)) !== FALSE) {
		while($row = $result->fetch_row()) {
			$ret[] = $row;
		}
		return $ret;
	}
	elseif($fail) fail('Query failed: ' . $query, true);
}

//now connect to the MySQL 'games' database
$user = 'root';
$pass = 'tsup**dl3';
//*/
/*$user = '1380903';
$pass = 'playtime';
//*/

$db = 'games';
$mysqli = new mysqli('localhost', $user, $pass, $db);
if($mysqli->connect_errno) {
	fail('Could not connect to database');
}

?>
