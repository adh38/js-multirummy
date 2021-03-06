//global game specs
var suits = ['Clubs', 'Spades', 'Diamonds', 'Hearts']
var numbers = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
var numCards = suits.length * numbers.length, handSize = 7, dealt = false;

//what I think is the current game state, so the server can tell me when it changes
var state = {
	nickname:'', //my state.nickname in the game room
	game:'', //game I am part of
	hand: {}, //my current hand
	owner:'', //owner of my game
	turn:'', //player whose turn it is
	winner:'', //player who has won my game
	players:{}, //all players in the game room
	games:{}, //all existing games - key = name of game, value = game attributes [eg. inProgress]
	request:'', //game I am requesting to join
	requests:{} //all requests to join my game, if I am the owner - key = name of requester, val = nothing yet
};

function initGame() {
	//generate all 52 cards as a stack on the upper left
	$('div.pile > .inner').empty(); //the inner div of a pile holds its cards
	$stack = $('#stack');
	//make an array of the numbers 0-51
	var cards = []
	for(var i = 0; i < numCards; i++) cards.push(i);
	//and randomly iterate over it to generate the .card divs in the deck, until it is empty - this way the deck is shuffled
	for(var i = 0; i < numCards; i++) {
		var c = 0; //Math.floor(Math.random() * cards.length); //we don't need to shuffle, as that is now handled by MySQL
		var s = Math.floor(cards[c] / numbers.length);
		var n = cards[c] % numbers.length;
		text = n < 9 ? ''+(n+2) : numbers[n].charAt(0);
		text += suits[s].charAt(0);
		//create the card div
		$card = $('<div class="card" index="' + cards[c] + '" suit="' + suits[s] + '" number="' + numbers[n] + '"></div>');
		$card.attr('dealt','false');
		$card.attr('moving','false');
		$card.attr('mousePressed','false');
		$card.append('<div><div>' + text + '</div></div>'); //see rummy.css - 2 nested divs required to center text within card
		//now add the card to the deck
		$('#stack > .inner').append($card);
		//and remove that card from the remaining pile
		cards.splice(c, 1);
		
		//for each card, create an invisible 'target card' that will be used as the endpoint for animated movements between piles
		$card.data('targetCard', $card.clone().css('visibility','hidden'));

		//cards can be dragged and dropped between the hand and set piles
/*		$card.draggable({
			disabled: true,
			cancel: '[moving="true"]',
			distance: 15,
			revert: 'invalid',
			helper: 'clone',
			cursor: 'move',
			zIndex: 1,
			start: function(event,ui) {
				$(this).css('visibility','hidden');
			},
			stop: function(event,ui) {
				$(this).css('visibility','');
			}
		});
		$card.droppable({
			tolerance: 'intersect',
			scope: 'notDroppable', //placeholder that means this cannot be dropped on until it is dealt
			accept: function(draggable) { //don't allow moving cards to be dragged onto
				return $(this).attr('moving') === 'false';
			},
			activate: function(event,ui) {
				//console.log(cardName($(this)) + ' ready to receive ' + cardName(ui.draggable));
			},
			drop: function(event,ui) {
				var $this = $(this), $other = ui.draggable, $before;
				//console.log(cardName($other) + ' dropped onto ' + cardName($this) + ' from ' + JSON.stringify(ui.helper.position()));
				if(getPile($other) !== getPile($this) || $other.index() > $this.index())
					$before = $this;
				else {
					$before = nextCard($this);
				}
				//start the animation from the position of the 'helper' that the user is dragging
				moveCard($other, getPile($this), 0, $before, ui.helper.position());
			},
		});
//*/
		
		//clicking a hand/set card also toggles which pile it is in
		//and right-clicking a hand card discards it - we need .mousedown/.mouseup because .click doesn't handle right-clicks
		$card.mousedown(function(event) {
			$(this).attr('mousePressed','true');
			return true;
		});
		$card.mouseup(function(event) {
			var $this = $(this);
			if($this.attr('mousePressed') !== 'true') return true;
			//console.log(cardName($(this)) + ' clicked');
			$this.attr('mousePressed','false');
			switch(getPile($this)) {
				case 'stack':
					//if(!dealt) deal();
					break;
				case 'hand': //move a clicked card from the hand to the temporary zone for building runs/sets
					if(event.which === 1 || event.button === 1) moveCard($this, 'set', 0, undefined, {});
					else {
						$.ajax({
							url:'discard.php',
							data:{'nickname':state.nickname, 'card':$this.attr('index')},
							dataType:'json',
							success: function(data) {
								console.log('ajax success');
								serverLog(data.response);
							},
							error: function(jqXHR, textStatus, errorThrown) {
								console.log('ajax - ' + textStatus + ': ' + errorThrown);
							},
							complete: function() {console.log('ajax complete');}
						});
					}
					break;
				case 'set':
					moveCard($this, 'hand', 0, undefined, {});
					break;
				default:
					break;
			}
			return true;
		});
//*/
	}

//TRIED USING SORTABLE - COULDN'T GET IT TO LOOK SMOOTH	
	$('#hand > .inner').sortable({
		revert: true,
		cancel: '[moving="true"]',
		connectWith: '#set',
		dropOnEmpty: true,
		cursor: 'move',
		helper: 'clone',
		distance: 15,
		tolerance: 'pointer',
		zIndex: 5,
		start: function(e, ui) {
			var $ph = $(ui.placeholder);
			$ph.data('lastPos',$(ui.item).index()); //mark where the card is when we start dragging it
			console.log('sort starting at ' + $(ui.item).index());
		},
		change: function(e, ui) {
			var $ph = $(ui.placeholder);
			console.log('sorted from ' + $ph.data('lastPos') + ' to ' + $ph.index());
			if($ph.data('lastPos') > $ph.index()) { //shifted left
				var $next = $ph.next();
				if($next.length > 0) {
					$next.css({'margin-left':'0px','margin-right':'125px'}).animate(
						{'margin-left':'25px','margin-right':'0px'},
						{duration:500, complete: function() {checkWin();} });
					$ph.css('width','0px').animate({'width':'100px'},500);
				}else checkWin();
			}else { //shifted right
				var $prev = $ph.prev();
				if($prev.length > 0) {
					$prev.css('margin-left','150px').animate(
						{'margin-left':'25px'},
						{duration:500, complete: function() {checkWin();} });
					$ph.css({'margin-left':'0px','width':'0px'}).animate({'margin-left':'25px','width':'100px'},500);
				}else checkWin();
			}
			$ph.data('lastPos', $ph.index());
		},
//*/
	});
/*	$('#set > .inner').sortable({
		revert: 500,
		cancel: '[moving="true"]',
		connectWith: '#set',
		dropOnEmpty: true,
		cursor: 'move',
		helper: 'clone',
		distance: 15,
		tolerance: 'intersect',
		zIndex: 5
	});
//*/
}

function resetGame() {
	//set all buttons/messages back to initial state
	$('#win_message').css({'visibility':'', 'font-size':''});
	$('#rules_message').css({'visibility':'', 'pointer-events':''});
	dealt = false;
	for(var i = 0; i < numCards; i++) {
		getCard(i).detach().attr('dealt','false').appendTo($('#stack > .inner'));
	}
	state.hand = {};
}
function leaveGame() {
	resetGame();
	setState('owner', '');
	setState('turn', '');
	setState('winner', '');
	setState('request', '');
}

function cardName($card) {
	return $card.attr('number') + ' of ' + $card.attr('suit');
}

//given index from 0-51, get card div
function getCard(index) {
	return $('.card[index="' + index + '"]').filter(function() { return typeof $(this).data('targetCard') !== 'undefined'; });
}

function sameCard($card1, $card2) {
	return $card1.attr('index') === $card2.attr('index');
}

//determine a card's current pile
function getPile($card) {
	return $card.parents('.pile').attr('id');
}

//given array of 7 card indices, deal them
function deal(hand) {
	for(var i = 0; i < hand.length; i++) {
		dealCard(hand[i], i*150);
	}
	dealt = true;
}
//send the top card from the deck to the hand
function dealCard(index, delay) {
	state.hand[index] = [1];
	var $card = getCard(index);
	console.log('dealing ' + index + '=' + cardName($card));
	$card.detach().appendTo('#stack > .inner');
	$card.attr('dealt','true');
	moveCard($card, 'hand', delay, undefined, {});
}
function discardCard(index, delay) {
	if(!state.hand.hasOwnProperty(index)) return;
	delete state.hand[index];
	var $card = getCard(index);
	$card.attr('dealt','true'); //in case it wasn't yet
	console.log('discarding ' + index + '=' + cardName($card));
	moveCard($card, 'discard', delay, undefined, {});
}
function topCard() {
	var $stack = $('#stack > .inner > .card[dealt="false"]');
	if($stack.length === 0) return undefined;
	return $stack.last();
}

/* move the specified card to a new pile or a new slot within its current pile
 *  $card: the .card div to move
 *  pile: the id string of the destination pile
 *  delay: milliseconds before the animation begins (useful for staggering the initial deal) - use 0 for no delay
 *  $before: optionally, the card in the destination pile to insert this one in front of - use undefined to add it to the end
 *  from: the position to begin animating from - if this card was dragged into place, use the position of its Draggable's helper, else use {}
 */
function moveCard($card, pile, delay, $before, from) {

	/* here is the protocol: 
	 *   1) identify all cards that will need to move
	 *   2) switch these all to absolute position so we can animate their top and left properties
	 *   3) place all their target cards at their destination as a placeholder/indicator of where to move to
	 *   4) perform the animations
	 */
	 
	/* STEP 1 */
	var $curPile = $('#' + getPile($card) + ' > .inner'), $movingCards = $card;
	var $newPile = $('#' + pile + ' > .inner');
	$card.attr('moving','true');
	//if either the source or destination pile is a line of cards rather than a stack, some cards may need to shift left/right
	if($curPile.css('position') !== 'absolute' || $newPile.css('position') !== 'absolute') {
		//if moving from one pile to another...
		if($curPile[0] !== $newPile[0]) {
			//the cards to my right in the source pile will shift left by one slot
			$movingCards = $movingCards.add($card.nextAll('.card[moving="false"]').filter(function() {
				return typeof $(this).data('targetCard') !== 'undefined'; }));
			//and the cards to my right in the destination pile will shift right by one slot
			if($before !== undefined && $newPile.css('position') !== 'absolute')
				$movingCards = $movingCards.add($before.add($before.nextAll('.card[moving="false"]').filter(function() {
					return typeof $(this).data('targetCard') !== 'undefined'; })));
			$movingCards.each(function(i) { if(typeof $(this).data('targetCard') === 'undefined') console.log("1 can't move: " + cardName($(this))); });
		}else { //if moving within a pile, the cards between my current and destination slots will shift
			var start, end; //first identify those slots
			if($before !== undefined) {
				if($before.index() < $card.index()) {
					start = $before.index();
					end = $card.index()+1;
				}else {
					start = $card.index();
					end = $before.index();
				}
			}else {
				start = $card.index();
				end = $curPile.children().length;
			}
			//then find all non-moving, non-target cards within that range of slots (non-target means I have a target)
			$range = $curPile.children().slice(start, end);
			$range = $range.filter(function() { return ((typeof $(this).data('targetCard')) !== 'undefined'); });
			$movingCards = $movingCards.add($range);
		}
	}
	
	/* STEP 2 */
	//cache each card's current position so it isn't changed by starting to animate the one to the left of it
	$movingCards.each(function(i) {
		if(sameCard($(this), $card) && from.hasOwnProperty('top')) $(this).data('curPos', from);
		else $(this).data('curPos', $(this).position());
	});
	//switch each card to absolute position for the duration of the animation...
	$movingCards.each(function(i) {
		var $this = $(this), pos = $(this).data('curPos');
		$this.css('position', 'absolute');
		if(sameCard($this, $card)) $this.css('z-index','1');
		$this.css({'top': pos.top+'px', 'left': pos.left+'px'}); //make sure it stays in place when switching to absolute
	});
	
	/* STEP 3 */
	//get all the target cards in place so we know their positions
	$movingCards.each(function(i) {
		var $this = $(this);
		if(typeof $this.data('targetCard') === 'undefined') console.log("2 can't move: " + cardName($this));
		var $target = $this.data('targetCard').detach().css({'position':'','top':'0','left':'0'});
		if(!sameCard($this, $card)) $target.insertAfter($this);
		else {
			if($before === undefined) $target.appendTo($newPile);
			else $target.insertBefore($before);
		}
	});
	
	/* STEP 4 */
	//do the animation!
	$movingCards.each(function(i) {
		var $this = $(this), $target = $this.data('targetCard');
		var pos = $(this).data('curPos');
		var deltaTop = $target.offset().top - $this.offset().top, deltaLeft = $target.offset().left - $this.offset().left;
		console.log('moving ' + cardName($this) + ' from ' + pos.top + ',' + pos.left + ' by ' + deltaTop + ',' + deltaLeft + ' to pile ' + pile);
		$this.stop().delay(delay).animate(
			{
				top:'+='+deltaTop+'px',
				left:'+='+deltaLeft+'px'
			},
			{
				duration: sameCard($this, $card) && !from.hasOwnProperty('top') ? 1000 : 500,
				complete: function() {
					$this.css({'position':'', 'z-index':'', 'top':'0', 'left':'0'});
					$target.replaceWith($this);
/*					if(getPile($this) === 'hand') {
						$this.draggable('option','disabled',false);
						$this.draggable('option','scope','hand');
						$this.setDroppableScope('hand');
					}else if(getPile($this) === 'discard') {
						$this.draggable('option','disabled',true);
					}
//*/
					$this.attr('moving','false');
					if($('.card[moving="true"]').length === 0) checkWin();
				}
			}
		);
	});
}

//find the next/previous card in my line - be sure to exclude moving cards and target cards
function nextCard($card) {
	var $next = $card.nextAll('.card[moving="false"]').filter(function() {
		return typeof $(this).data('targetCard') !== 'undefined'});
	return $next.length > 0 ? $next.first() : undefined;	
}
function prevCard($card) {
	var $prev = $card.prevAll('.card[moving="false"]').filter(function() {
		return typeof $(this).data('targetCard') !== 'undefined'});
	return $prev.length > 0 ? $prev.first() : undefined;	
}

function printPos($card) {
	//console.log($card.attr('number') + ' of ' + $card.attr('suit') + ' at ' + $card.css('top') + ',' + $card.css('left') + ' under ' + $card.parent().attr('id'));
}

function checkWin() {
	console.log('checking win');
	var hand = '', win = false;
	//build the list of cards
	$('#hand>.inner, #set>.inner').each(function(i) {
		var $card = $(this).children(':first');
		if($card.length < 1) return;
		do {
			hand += $card.attr('index') + ',';
		}while(($card = nextCard($card)) !== undefined);
	});
	hand = hand.substring(0, hand.length-1);
	
	//ask the server to check if I win
	$.ajax({
		url:'check_win.php',
		async: false,
		data:{'nickname':state.nickname, 'hand':hand},
		dataType: 'json',
		success: function(data) {
			console.log('ajax success');
			win = data.win;
			serverLog(data.response);
			serverLog('Win? ' + typeof data.win);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ajax - ' + textStatus + ': ' + errorThrown);
		}
	});

	console.log('result: ' + win);
	if(win) {
		console.log('YOU WIN');
		victoryAnimation();
	}
	return win;
}

function victoryAnimation() {
	var $winMessage = $('#win_message');
	$winMessage.html('CONGRATULATIONS!');
	$winMessage.css({'visibility':'visible', 'font-size':''});
	$winMessage.animate({'font-size':'100px'}, 2000);
}
function failureAnimation() {
	var $winMessage = $('#win_message');
	$winMessage.html('SORRY, YOU LOSE.');
	$winMessage.css({'visibility':'visible', 'font-size':'100px'});
}

function addPlayer(name) {
	if(name === state.nickname) return; //long_poll saw our new nickname in the DB and thought it was another player
	state.players[name] = [1];
	var $player = $('<li class="player" name="' + name + '">' + name + '</li>');
	$('#player_list').append($player);
}
function removePlayer(name) {
	delete state.players[name];
	$('li[.player][name="'+name+'"]').remove();
}

//add a game to the list - if not yet in progress, I can request to join it
function addGame(name, inProgress) {
	serverLog('got game ' + name + ', ' + inProgress);
	state.games[name] = [inProgress];
	var $game = $('<li class="game" name="' + name + '">' + name + '</li>');
	var $button = $('<button type="button" class="join_game" name="' + name + '">Request to Join</button>');
	$button.click(join_request);
	if((!inProgress || inProgress === '0') && name !== state.nickname) $button.css('visibility', 'visible');
	else $button.css('visibility', 'hidden');
	$game.append($button);
	$('#game_list').append($game);
}
//request to join a game upon clicking the Join button
function join_request() {
	var $this = $(this), par = this.parentNode, name = par.childNodes[0].nodeValue;
	$.ajax({
		url:'place_request.php',
		data:{'nickname':state.nickname, 'game':name},
		dataType:'json',
		success: function(data) {
			serverLog(data.response);
			if(data.success) {
				//remove the Join button once the request is placed
				$this.css('visibility', 'hidden');
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ajax - ' + textStatus + ': ' + errorThrown);
		}
	});
}
function removeGame(name) {
	serverLog('game ' + name + ' is over');
	delete state.games[name];
	$('li[.game][name="' + name + '"]').remove();
}
function setInProgress(name, inProgress) {
	console.log('setting game ' + name + ' inprogress to ' + inProgress);
	console.log('my game is ' + state.game + ', owner ' + state.owner);
	state.games[name] = inProgress;
	if(name === state.game && state.nickname === state.owner) {
		if(!inProgress || inProgress === '0') $('#begin_game').show();
		else $('#begin_game').hide();
	}
	else {
		if(!inProgress || inProgress === '0') $('button[.join_game][name="' + name + '"]').show();
		else $('button[.join_game][name="' + name + '"]').hide();
	}
}

//add a request by player <name> to join this game
function addRequest(name) {
	state.requests[name] = [1];
	var $request = $('<li class="request" name="' + name + '">' + name + '</li>');
	var $accept = $('<button type="button" class="accept_request">Accept</button>');
	var $reject = $('<button type="button" class="reject_request">Reject</button>');
	$accept.click(decide_request);
	$reject.click(decide_request);
	$request.append($accept);
	$request.append($reject);
	$('#request_list').append($request);
}
function decide_request() {
	//get decision from class name
	var decision = this.className.replace('_request', '');
	var $parent = $(this).parent(), name = $parent.attr('name');
	$.ajax({
		url:'process_request.php',
		data:{'nickname':state.nickname, 'name':name, 'decision':decision},
		dataType:'json',
		success:function(data) {
			serverLog(data.response);
			serverLog(decision + 'ed ' + name);
			if(data.success) {
				$parent.remove();
				delete state.requests[name];
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ajax - ' + textStatus + ': ' + errorThrown);
		}
	});
}
function removeRequest(name) {
	serverLog('request by ' + name + ' has been rescinded');
	delete state.requests[name];
	$('li[.request][name="' + name + '"]').remove();
}

//initiate the indefinite long-polling of the server to receive any updates (eg. when it's my turn)
function poll() {
	//console.log('request: ' + state.request + ' [' + state.request.length + ']');
	//console.log('sending: ' + JSON.stringify(state));
	$.ajax({
		url:'long_poll.php',
		type: 'POST',
		data: state, //pass what I think is the current game state - server will send updates if there are any
		dataType:'json',
		success: function(data) {
			serverLog(data.response);
			if(data.hasOwnProperty('game')) {
				setState('game', data.game);
				if(!isNull(state.game)) {
					serverLog('You are now part of game ' + state.game);
					$('#create_game').hide();
					$('.join_game').hide(); //disable all Join buttons while in a game
					$('#leave_game').show();
				}else {
					serverLog('You have left the game');
					$('#create_game').show();
					$('.join_game').show();
				}
			}
			if(data.hasOwnProperty('request')) {
				if(isNull(data.request) && state.game == '') {
					serverLog('Request to join ' + state.request + ' was denied');
					$('.join_game').show();
				}
				setState('request', data.request);
			}
			if(data.hasOwnProperty('owner')) {
				setState('owner', data.owner);
				serverLog('Game owner has been changed to ' + data.owner);
			}
			if(data.hasOwnProperty('turn')) {
				setState('turn', data.turn);
				serverLog('It is now ' + (data.turn === state.nickname ? 'YOUR' : data.turn + "'s") + ' turn');
			}
			if(data.hasOwnProperty('winner')) {
				setState('winner', data.winner);
				serverLog(data.winner + ' wins!');
			}
			//fields with multiple values are returned from the server in the form:
			//  [number of values removed since last update, values removed since last update, values added since last update]
			if(data.hasOwnProperty('hand')) {
				var i;
				for(i = 1; i < 1+data.hand[0]; i++) discardCard(data.hand[i][0]);
				for(; i < data.hand.length; i++) dealCard(data.hand[i][0], (i-(1+data.hand[0]))*150);
			}
			if(data.hasOwnProperty('requests')) {
				var i;
				for(i = 1; i < 1+data.requests[0]; i++) removeRequest(data.requests[i][0]);
				for(; i < data.requests.length; i++) addRequest(data.requests[i][0]);
			}
			if(data.hasOwnProperty('players')) {
				var i;
				for(i = 1; i < 1+data.players[0]; i++) removePlayer(data.players[i][0]);
				for(; i < data.players.length; i++) addPlayer(data.players[i][0]);
			}
			if(data.hasOwnProperty('games')) {
				var i;
				for(i = 1; i < 1+data.games[0]; i++) removeGame(data.games[i][0]);
				for(; i < data.games.length; i++) {
					if(state.games.hasOwnProperty(data.games[i][0]))
						setInProgress(data.games[i][0], data.games[i][1]);
					else addGame(data.games[i][0], data.games[i][1]);
				}
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ajax - ' + textStatus + ': ' + errorThrown);
		},
		complete: poll
	});
}

function serverLog(str) {
	var arr = str.split('\n'), div = $('#server_msg')[0];
	for(var i = 0; i < arr.length; i++) {
		div.innerHTML = arr[i] + '<br />' + div.innerHTML;
	}
}
function isNull(val) {
	return val == '' || val === undefined || val === null;
}
function setState(key, data) {
	console.log('setting ' + key);
	if(isNull(data)) state[key] = '';
	else state[key] = data;
	if(key === 'owner' || key === 'turn' || key === 'winner') $('#game_' + key).html(key.charAt(0).toUpperCase()
		+ key.substr(1) + ': ' + state[key]);
}

function login() {
	var promptStr = 'Enter your nickname.';
	while(state.nickname == '') {
		state.nickname = prompt(promptStr);
		if(state.nickname == '') return false;
		$.ajax({
			url:'register.php',
			async:false,
			data:{'name':state.nickname},
			dataType:'json',
			success: function(data) {
				serverLog(data.response);
				if(!data.success) state.nickname = '';
				else {
					$('#logout_msg').hide();
					$('#login_msg').show();
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('ajax - ' + textStatus + ': ' + errorThrown);
			}
		});
		promptStr = 'Name is already taken. Enter your nickname.';
	}
	console.log('joining as ' + state.nickname);
	$('#nickname').html(state.nickname);
	return true;
}

//all the setup is done from here
$(document).ready(function() {

	$('#stop_script').click(function() {
		exit(0); //see exit routine at bottom - from http://stackoverflow.com/questions/550574/how-to-terminate-the-script-in-javascript
	});

	initGame();
	if(!login()) return; //unsuccessful login
	poll(); //start polling the server for updates, eg. to the list of games we can join
	
/*	$.ajax({
		url:'join_game.php',
		data:{'player':state.nickname},
		dataType:'json',
		success: function(data) {
			console.log('ajax success');
			serverLog(data.response);
			poll();
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ajax - ' + textStatus + ': ' + errorThrown);
		},
		complete: function() {console.log('ajax complete');}
	});
//*/
	
	//need this to allow right-clicks on cards
	$('#card_panel')[0].oncontextmenu = function(){return false;};

	//make sure no card thinks the mouse is still pressed on it when it isn't
	$(document).mouseup(function(event) {
		$('.card[mousePressed="true"]').attr('mousePressed','false');
	});

	//start button toggles to the Reset button once the game is started
	$('#start_button').html('Join Game');
	$('#start_button').click(function() {
		state.nickname = $('#nickname').val();
		if(state.nickname.length > 0) {
			console.log('joining as ' + state.nickname);
			$.ajax({
				url:'join_game.php',
				data:{'nickname':state.nickname},
				dataType:'json',
				success: function(data) {
					console.log('ajax success');
					serverLog(data.response);
					var hand = '';
					for(var c = 0; c < data.hand.length; c++) hand += data.hand[c] + ' ';
					serverLog(hand);
					deal(data.hand);
					poll();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					console.log('ajax - ' + textStatus + ': ' + errorThrown);
				},
				complete: function() {console.log('ajax complete');}
			});
		}
	});
	
	var toggle_rules = function() {
		var $msg = $('#rules_message');
		if($msg.css('visibility') !== 'visible')
			$msg.css({'visibility':'visible', 'pointer-events':'auto'});
		else $msg.css({'visibility':'', 'pointer-events':''});
	}
	$('#rules_button').click(toggle_rules);
	$('#rules_message').click(toggle_rules);
	
	$('#create_game').show();
	$('#create_game').click(function() {
		var $this = $(this);
		$.ajax({
			url:'new_game.php',
			data:{'nickname':state.nickname},
			dataType:'json',
			success: function(data) {
				serverLog(data.response);
				if(data.success) {
					$this.hide();
					$('#begin_game').show();
					$('#leave_game').show();
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('ajax - ' + textStatus + ': ' + errorThrown);
			}
		});
	});
	
	$('#begin_game').hide();
	$('#begin_game').click(function() {
		var $this = $(this);
		resetGame();
		$.ajax({
			url:'begin_game.php',
			data:{'nickname':state.nickname},
			dataType:'json',
			success: function(data) {
				serverLog(data.response);
				if(data.success) {
					$this.hide();
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('ajax - ' + textStatus + ': ' + errorThrown);
			}
		});
	});
	
	$('#leave_game').hide();
	$('#leave_game').click(function() {
		var $this = $(this);
		leaveGame();
		$.ajax({
			url:'leave_game.php',
			data:{'nickname':state.nickname},
			dataType:'json',
			success: function(data) {
				serverLog('leave_game: ' + data.response);
				if(data.success) {
					$this.hide();
					$('#begin_game').hide();
					$('#create_game').show();
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('ajax - ' + textStatus + ': ' + errorThrown);
			}
		});
	});
	
	$('#login_msg').show();
	$('#login').click(function() {
		login();
	});
	
	$('#logout_msg').hide();
	$('#logout').click(function() {
		$.ajax({
			url: 'logout.php',
			data:{'nickname':state.nickname},
			dataType:'json',
			success: function(data) {
				serverLog(data.response);
				leaveGame();
				setState('nickname', '');
				$('#login_msg').hide();
				$('#logout_msg').show();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('ajax - ' + textStatus + ': ' + errorThrown);
			}
		});
	});
	
	//for real-time troubleshooting by logging the result of any line of JavaScript code
	$('#debug_text').keypress(function(e) {
		switch(e.which) {
			case 10:
			case 13:
				console.log(eval($(this).val()));
				break;
			default:
				break;
		}
	});
	
	//you can also hard-code a line to print out if you think eval() won't treat it properly
	$('#debug_button').click(function() {
		console.log(jQuery.data($('#stack > inner')[0],'masonry'));
	});
	
	//$('*').click(function() { console.log(this.tagName + '[' + this.id + ',' + this.className + ']')});
});

//fix for jQuery bug when setting 'scope' option for a droppable
//taken directly from http://stackoverflow.com/questions/3097332/jquery-drag-droppable-scope-issue
//submitted bug ticket http://bugs.jqueryui.com/ticket/9287
jQuery.fn.extend({

    setDroppableScope: function(scope) {
        return this.each(function() {
            var currentScope = $(this).droppable("option","scope");
            if (typeof currentScope == "object" && currentScope[0] == this) return true; //continue if this is not droppable

            //Remove from current scope and add to new scope
            var i, droppableArrayObject;
            for(i = 0; i < $.ui.ddmanager.droppables[currentScope].length; i++) {
                var ui_element = $.ui.ddmanager.droppables[currentScope][i].element[0];

                if (this == ui_element) {
                    //Remove from old scope position in jQuery's internal array
                    droppableArrayObject = $.ui.ddmanager.droppables[currentScope].splice(i,1)[0];
                    //Add to new scope
                    $.ui.ddmanager.droppables[scope] = $.ui.ddmanager.droppables[scope] || [];
                    $.ui.ddmanager.droppables[scope].push(droppableArrayObject);
                    //Update the original way via jQuery
                    $(this).droppable("option","scope",scope);
                    break;
                }
            }
        });
    }
});

function exit( status ) {
    // http://kevin.vanzonneveld.net
    // +   original by: Brett Zamir (http://brettz9.blogspot.com)
    // +      input by: Paul
    // +   bugfixed by: Hyam Singer (http://www.impact-computing.com/)
    // +   improved by: Philip Peterson
    // +   bugfixed by: Brett Zamir (http://brettz9.blogspot.com)
    // %        note 1: Should be considered expirimental. Please comment on this function.
    // *     example 1: exit();
    // *     returns 1: null

    var i;

    if (typeof status === 'string') {
        alert(status);
    }

    window.addEventListener('error', function (e) {e.preventDefault();e.stopPropagation();}, false);

    var handlers = [
        'copy', 'cut', 'paste',
        'beforeunload', 'blur', 'change', 'click', 'contextmenu', 'dblclick', 'focus', 'keydown', 'keypress', 'keyup', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'resize', 'scroll',
        'DOMNodeInserted', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument', 'DOMNodeInsertedIntoDocument', 'DOMAttrModified', 'DOMCharacterDataModified', 'DOMElementNameChanged', 'DOMAttributeNameChanged', 'DOMActivate', 'DOMFocusIn', 'DOMFocusOut', 'online', 'offline', 'textInput',
        'abort', 'close', 'dragdrop', 'load', 'paint', 'reset', 'select', 'submit', 'unload'
    ];

    function stopPropagation (e) {
        e.stopPropagation();
        // e.preventDefault(); // Stop for the form controls, etc., too?
    }
    for (i=0; i < handlers.length; i++) {
        window.addEventListener(handlers[i], function (e) {stopPropagation(e);}, true);
    }

    if (window.stop) {
        window.stop();
    }

    throw '';
}
