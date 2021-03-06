/*
	AntiCrux - Artificial intelligence playing AntiChess and AntiChess960 with jQuery Mobile and Node.js
	Copyright (C) 2016-2017, ecrucru

		https://github.com/ecrucru/anticrux/
		http://ecrucru.free.fr/?page=anticrux

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

var	ai = new AntiCrux(),
	ai_rewind = new AntiCrux(),
	ui_mobile, ui_cordova, ui_move, ui_move_pending, ui_possibledraw, ui_rewind, ui_rematch;

ai.options.board.symbols = true;
ai.defaultBoard();

function acui_options_load() {
	var level;

	//-- Common elements
	$('#acui_option_darktheme').prop('checked', ai.options.board.darkTheme);
	$('#acui_option_rotated').prop('checked', ai.options.board.rotated);

	//-- Mobile version
	if (ui_mobile)
	{
		level = ai.getLevel();
		if (level !== null)
			$('#acui_option_level').val(level).slider('refresh');
	}
	else
	//-- Desktop version
	{
		//- AI
		$('#acui_option_maxdepth').val(ai.options.ai.maxDepth);
		$('#acui_option_maxnodes').val(ai.options.ai.maxNodes);
		$('#acui_option_minimizeliberty').prop('checked', ai.options.ai.minimizeLiberty);
		$('#acui_option_maxreply').val(ai.options.ai.maxReply).slider('refresh');
		$('#acui_option_wholenodes').prop('checked', ai.options.ai.wholeNodes);
		$('#acui_option_randomizedsearch').prop('checked', ai.options.ai.randomizedSearch);
		$('#acui_option_pessimisticscenario').prop('checked', ai.options.ai.pessimisticScenario);
		$('#acui_option_beststaticscore').prop('checked', ai.options.ai.bestStaticScore);
		$('#acui_option_opportunistic').prop('checked', ai.options.ai.opportunistic);
		$('#acui_option_handicap').val(ai.options.ai.handicap).slider('refresh');
		$('#acui_option_acceleratedendgame').prop('checked', ai.options.ai.acceleratedEndGame);
		$('#acui_option_oyster').prop('checked', ai.options.ai.oyster);

		//- Board
		$('#acui_option_fischer').val(ai.options.board.fischer);
		$('#acui_option_assistance').prop('checked', ai.options.board.assistance);
		$('#acui_option_symbol').prop('checked', ai.options.board.symbols);
		$('#acui_option_coordinates').prop('checked', ai.options.board.coordinates);
		$('#acui_option_nostatonforcedmove').prop('checked', ai.options.board.noStatOnForcedMove);
		$('#acui_option_nostatonownmove').prop('checked', ai.options.board.noStatOnOwnMove);
		$('#acui_option_debugcellid').prop('checked', ai.options.board.debugCellId);

		//- Variant
		$('#acui_option_enpassant').prop('checked', ai.options.variant.enPassant);
		$('#acui_option_promotequeen').prop('checked', ai.options.variant.promoteQueen);
		$('#acui_option_pieces').val(ai.options.variant.pieces).change();
	}
}

function acui_reset_ui(pResetPlayer) {
	ui_rewind = false;
	$('#acui_tab_board_header').trigger('click');
	$('#acui_valuation').val(0).slider('refresh');
	$('#acui_score, #acui_lastmove, #acui_assistance, #acui_nodes, #acui_depth, #acui_moves, #acui_history').html('');
	$('#acui_sect_rewind').hide();
	$('#acui_pgn').addClass('ui-disabled');
	ai.resetStats();
	if (pResetPlayer)
		$('#acui_player').val(ai.constants.owner.white).change();
}

function acui_refresh_board() {
	//-- Checks the current mode
	if (ui_rewind)
		return false;

	//-- Refreshes the board
	var player = parseInt($('#acui_player').val());
	ai.freeMemory();
	$('#acui_board').html(ai.toHtml());
	$('#acui_board').css('width', (ai.options.board.coordinates?420:400) + 'px');
	$('#acui_board').css('height', $('#acui_board').css('width'));

	//-- Reactivates the cells of the board
	$('.AntiCrux-board-cell-0, .AntiCrux-board-cell-1, .AntiCrux-board-cell-hl').click(function() {
		var move = this.dataset.xy;

		//- Checks the format of the value
		if (!move.match(/^[a-h][1-8]$/))
			return false;

		//- Cancels the current move if it is the same position
		if (move == ui_move)
			ui_move = '';
		else
		{
			//- Overrides the existing selection if it is the same player
			if (ui_move.length == 2)
			{
				if (ai.getPieceByCoordinate(ui_move).owner == ai.getPieceByCoordinate(move).owner)
					ui_move = move;
				else
					ui_move += move;
			}
			else
			//- Appends the coordinate
				ui_move += move;
		}

		//- Makes a human move
		switch (ui_move.length)
		{
			case 4:
				// Statistics of the current situation
				if (!ai.options.board.noStatOnOwnMove)
					ai.getMoveAI(player);

				// Explicit move for the user
				move = ai.movePiece(ui_move, true, player);
				if (move != ai.constants.move.none)
					acui_promote(move);
				else
				{
					acui_popup('The move has been denied. Choose another one.');
					ai.highlight(true, null);
					acui_refresh_board();
				}
				ai.freeMemory();
				ui_move = '';
				break;

			case 0:
			case 2:
				ai.highlight(true, ui_move);
				acui_refresh_board();
				break;

			default:
				throw 'Internal error - Report any error (#001)';
		}
		return true;
	});
	return true;
}

function acui_refresh_moves() {
	var val, player = parseInt($('#acui_player').val());
	$('#acui_valuation').val($('#acui_option_pro').prop('checked') ? ai.constants.score.neutral : ai.getScore().valuationSolverPC).slider('refresh');
	$('#acui_score').html($('#acui_option_pro').prop('checked') ? ai.constants.score.neutral : ai.getScore().valuationSolverPC);
	val = ai.getNumNodes();
	$('#acui_nodes').html((val === 0 ? '' : 'Nodes : '+val));
	val = ai.getReachedDepth();
	$('#acui_depth').html((val === 0 ? '' : 'Depth : '+val));
	$('#acui_moves').html($('#acui_option_pro').prop('checked') ? '<div>No statistical data with the professional mode.</div>' : ai.getMovesHtml(player));
}

function acui_refresh_history(pScroll) {
	//-- Main table
	var hist = ai.getHistoryHtml();
	$('#acui_history').html(hist);
	if (hist.length === 0)
		$('#acui_pgn').addClass('ui-disabled');
	else
		$('#acui_pgn').removeClass('ui-disabled');
	if (ui_rewind)
		$('#acui_sect_rewind').show();
	else
		$('#acui_sect_rewind').hide();
	if (pScroll)
		$('#acui_history_scrollbox').scrollTop(2*$('#acui_history').height());

	//-- Events
	$('.AntiCrux-history-item').click(function() {
		var	index = parseInt(this.dataset.index),
			hist = ai.getHistory(),
			i;

		//-- Checks
		if (hist.length === 0)
			return false;
		if ((index < 0) || (index >= hist.length))
			return false;

		//-- Determines the position for the provided index
		ai_rewind.copyOptions(ai);
		if (ai_rewind.options.variant.pieces == 3)
			ai_rewind.options.variant.pieces = 0;
		if (!ai_rewind.loadFen(ai.getInitialPosition()))
			return false;
		for (i=0 ; i<=index ; i++)
		{
			if (ai_rewind.movePiece(hist[i], false, ai_rewind.constants.owner.none) == ai_rewind.constants.move.none)
				throw 'Internal error - Report any error (#002)';
			else
			{
				ai_rewind.switchPlayer();
				ai_rewind.highlightMove(hist[i]);
			}
		}

		//-- Sets the mode
		acui_reset_ui(false);
		ui_rewind = true;
		$('#acui_player').val(ai_rewind.getPlayer()).change();
		acui_refresh_history(false);
		$('#acui_board').html(ai_rewind.toHtml());		//No event is attached to the cells
		return true;
	});
}

function acui_isRewind() {
	if (ui_rewind)
	{
		$('#acui_tab_board_history_header').trigger('click');	//Switches the tab to locate the button
		acui_popup('Leave the review of the game to continue with it.');
	}
	return ui_rewind;
}

function acui_promote(pMove) {
	ui_move_pending = pMove;
	if (ai.hasPendingPromotion())
		$('#acui_promotion').popup('open', {});
	else
		acui_afterHumanMove();
}

function acui_afterHumanMove() {
	ui_move = '';
	ai.updateHalfMoveClock();
	ai.logMove(ui_move_pending);
	ui_move_pending = ai.constants.move.none;
	acui_refresh_history(true);
	acui_refresh_board();
	if (ai.isEndGame(true))
	{
		acui_showWinner();
		acui_switch_players();
	}
	else
	{
		acui_switch_players();
		if ($('#acui_option_autoplay').prop('checked'))
		{
			if (ai.isDraw())
				acui_popup("The game ended in a tie.\n\nReason : "+ai.getDrawReason()+'.');
			else
			{
				if (ai.isPossibleDraw() && !ui_possibledraw)
				{
					acui_popup('The game is a possible draw.');
					ui_possibledraw = true;
				}
				setTimeout(	function() {		//Refreshes the screen before the AI plays
								$('#acui_play_ai').click();
							}, 1000);
			}
		}
	}
}

function acui_autostart() {
	if (ai.getPlayer() == (ai.options.board.rotated ? ai.constants.owner.white : ai.constants.owner.black))
		setTimeout(function() {
					$('#acui_play_ai').click();
				}, 500);
}

function acui_switch_players() {
	if (ai.getPlayer() == ai.constants.owner.black)
		$('#acui_player').val(ai.constants.owner.white).change();
	else
		$('#acui_player').val(ai.constants.owner.black).change();
}

function acui_showWinner() {
	var winner = ai.getWinner();
	if (winner == ai.constants.owner.none)
		throw 'Internal error - Report any error (#003)';
	winner = (winner == ai.constants.owner.white ? 'White' : 'Black');
	acui_popup('End of the game. '+winner+' has won !');
}

function acui_popup(pMessage) {
	setTimeout(function() {
					$('#acui_popup_text').html(pMessage.split("\n").join('<br/>'));
					$('#acui_popup').popup('open', {});
				}, 750);
}

function acui_fitBoard() {
	//-- Determines the best size
	var w = Math.floor(Math.min(screen.width, screen.height) / (ui_cordova ? window.devicePixelRatio : 1) * 0.85 / 8);

	//-- Applies the generated CSS
	if ((w < 50) && (ui_mobile || ui_cordova))
	{
		$('<style>')
			.prop('type', 'text/css')
			.html(	'.AntiCrux-board                        { height:'+(20+8*w)+'px; width:'+(20+8*w)+'px; }' +
					'.AntiCrux-board-coordinates-vertical   { line-height:'+w+'px;             }' +
					'.AntiCrux-board-coordinates-horizontal { width:'+w+'px;                   }' +
					'.AntiCrux-board-cell-0                 { width:'+w+'px; height:'+w+'px;   }' +
					'.AntiCrux-board-cell-1                 { width:'+w+'px; height:'+w+'px;   }' +
					'.AntiCrux-board-cell-hl                { width:'+w+'px; height:'+w+'px;   }' +
					'.AntiCrux-board-piece-11               { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece-12               { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece-13               { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece-14               { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece-15               { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece-16               { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece--11              { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece--12              { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece--13              { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece--14              { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece--15              { background-size:'+w+'px '+w+'px; }' +
					'.AntiCrux-board-piece--16              { background-size:'+w+'px '+w+'px; }'
				)
			.appendTo('head');
	}
}

function acui_isphone() {
	return (ui_cordova || (Math.min(screen.width, screen.height) < 768));
}

$(document).ready(function() {
	var i, defaultLevel;

	//-- Initialization
	ui_mobile = ($('#acui_ismobile').length > 0);
	ui_cordova = (window.cordova !== undefined);
	ui_move = '';
	ui_move_pending = ai.constants.move.none;
	ui_possibledraw = false;
	ui_rewind = false;
	ui_rematch = ai.constants.owner.white;
	acui_refresh_board();

	//-- Dynamic content
	acui_fitBoard();

	//-- Updates the list of players
	$('#acui_player').find('option').remove().end();
	$('<option/>').val(ai.constants.owner.white).html('White'+(ui_mobile?'':' to play')).appendTo('#acui_player');
	$('<option/>').val(ai.constants.owner.black).html('Black'+(ui_mobile?'':' to play')).appendTo('#acui_player');
	$('#acui_player').val(ai.constants.owner.white).change();

	//-- Updates the levels
	$('#acui_option_predef').find('option').remove().end();
	defaultLevel = ai.getLevel();
	for (i=1 ; i<=20 ; i++)
	{
		ai.setLevel(i);
		$('<option/>').val(i).html('Level '+i + (ai.options.ai.elo>0 ? ' ('+ai.options.ai.elo+')' : '')).appendTo('#acui_option_predef');
	}
	ai.setLevel(defaultLevel);

	//-- Events (General)
	$("input[type='text']").on('click', function () {
		$(this).select();
		return true;
	});

	//-- Title bar
	$('#acui_switch_ui').click(function() {
		window.location = (ui_mobile ? 'index.html' : 'mobile.html');
	});

	//-- Events (Board)
	$('#acui_player').change(function() {
		if (!ui_rewind)
			ai.setPlayer(parseInt($('#acui_player').val()));
		return !ui_rewind;
	});

	$('#acui_play_ai').click(function() {
		//-- Checks the current mode
		if (acui_isRewind())
			return false;

		//-- Inputs
		var	player = parseInt($('#acui_player').val()),
			move = ai.getMoveAI(player);

		//-- Checks
		if (move == ai.constants.move.none)
		{
			if (ai.isEndGame(false))
				acui_showWinner();
			return true;
		}

		//-- Moves
		$('#acui_lastmove').html('Last move : ' + ai.moveToString(move));
		$('#acui_assistance').html('Assistance : ' + ($('#acui_option_pro').prop('checked') || !ai.options.board.assistance ? '-' : ai.getAssistance(true, false)));
		acui_refresh_moves();
		if (ai.movePiece(move, true, player) != ai.constants.move.none)
		{
			ui_move = '';
			ai.updateHalfMoveClock();
			ai.logMove(move);
			acui_refresh_history(true);
			ai.highlightMove(move);
			if (ai.isEndGame(true))
				acui_showWinner();
			else
				if (ai.isDraw())
					acui_popup("The game ended in a tie.\n\nReason : "+ai.getDrawReason()+'.');
		}
		else
			throw 'Internal error - Report any error (#004)';
		acui_refresh_board();
		acui_switch_players();
		return true;
	});

	$('#acui_play_human').click(function() {
		//-- Checks the current mode
		if (acui_isRewind())
			return false;

		//-- Inputs
		var	player = parseInt($('#acui_player').val()),
			move = window.prompt('Type your move :', '0');

		//-- Checks
		if (move === null)
		{
			acui_popup('No move has been considered.');
			return false;
		}

		//-- Statistics of the current situation
		if (!ai.options.board.noStatOnOwnMove)
		{
			ai.getMoveAI(player);
			acui_refresh_moves();
		}

		//-- Explicit move for the user
		move = ai.movePiece(move, true, player);
		if (move != ai.constants.move.none)
			acui_promote(move);
		else
			acui_popup('The move has been denied. Choose another one.');
		ai.freeMemory();
		return true;
	});

	$('#acui_hint_soft').click(function() {
		//-- Checks the current mode
		if (ui_rewind)
			return false;

		//-- Simple hints
		ui_move = '';
		ai.highlightMoves(true);
		acui_refresh_board();
		return true;
	});

	$('#acui_hint_hard').click(function() {
		//-- Checks the current mode
		if (ui_rewind)
			return false;

		//-- Detailed hints
		ai.getMoveAI(parseInt($('#acui_player').val()));
		ui_move = '';
		ai.highlightMoves(false);
		acui_refresh_moves();
		acui_refresh_board();
		ai.freeMemory();
		return true;
	});

	$('#acui_hint_irma').click(function() {
		//-- Checks the current mode
		if (ui_rewind)
			return false;

		//-- Suggestion
		acui_popup(ai.predictMoves().split("\n").join('<br/>'));
		return true;
	});

	$('#acui_undo').click(function() {
		//-- Checks the current mode
		if (acui_isRewind())
			return false;

		//-- Undo
		var hist;
		if (ai.undoMove())
		{
			if ($('#acui_option_autoplay').prop('checked') && (ai.getHistory().length > 0))
				ai.undoMove();
			ui_move = '';
			ui_possibledraw = false;
			acui_reset_ui(false);
			acui_refresh_moves();
			acui_refresh_history(true);
			hist = ai.getHistory();
			if (hist.length > 0)
				ai.highlightMove(hist[hist.length-1]);
			acui_refresh_board();
		}
		else
			acui_popup('Impossible to undo because there is not enough history.');
		$('#acui_player').val(ai.getPlayer()).change();
		return true;
	});

	$('#acui_rewind').click(function() {
		//-- Checks
		if (!ui_rewind)
			return false;

		//-- Resets the mode
		acui_reset_ui(false);
		$('#acui_player').val(ai.getPlayer()).change();
		acui_refresh_board();
		acui_refresh_history(true);
		return true;
	});

	$('#acui_pgn').click(function() {
		var dl, pgn;

		//-- Gets the PGN data
		pgn = ai.toPgn({});
		if (pgn.length === 0)
			acui_popup('No data to export to PGN.');
		else
		{
			//- Downloads as a file
			// http://stackoverflow.com/questions/3665115/
			dl = document.createElement('a');
			dl.setAttribute('href', 'data:application/x-chess-pgn;charset=iso-8859-1,' + encodeURIComponent(pgn));
			dl.setAttribute('download', 'anticrux_'+(new Date().toISOString().slice(0, 10))+'_'+(new Date().toLocaleTimeString().replace(/[^0-9]/g, ''))+'.pgn');
			dl.style.display = 'none';
			document.body.appendChild(dl);
			dl.click();
			document.body.removeChild(dl);
		}
		return true;
	});

	$('.AntiCrux-board-promotion').click(function() {
		var piece = ai.promote(this.dataset.promotion);
		if (piece != ai.constants.piece.none)
		{
			ui_move_pending += 10000 * piece;
			acui_afterHumanMove();
			return true;
		}
		else
			return false;
	});

	//-- Events (Actions)
	$('#acui_clear').click(function() {
		ai.clearBoard();
		ui_move = '';
		ui_possibledraw = false;
		acui_reset_ui(true);
		acui_refresh_board();
		return true;
	});

	$('#acui_default').click(function() {
		ai.defaultBoard();
		ui_move = '';
		ui_possibledraw = false;
		acui_reset_ui(true);
		acui_refresh_board();
		acui_autostart();
		return true;
	});

	$('#acui_fischer_new').click(function() {
		$('#acui_option_fischer').dblclick();
		$('#acui_fischer_current').click();
		acui_popup('You are playing AntiChess ' + ai.fischer + '.');
		return true;
	});

	$('#acui_fischer_current').click(function() {
		ai.defaultBoard(ai.options.board.fischer);
		ui_move = '';
		ui_possibledraw = false;
		acui_reset_ui(true);
		acui_refresh_board();
		acui_autostart();
		return true;
	});

	$('#acui_rematch').click(function() {
		ui_rematch = (ui_rematch == ai.constants.owner.white ? ai.constants.owner.black : ai.constants.owner.white);
		$('#acui_option_rotated').prop('checked', (ui_rematch == ai.constants.owner.black)).checkboxradio('refresh').change();
		if (ai.fischer !== null)
		{
			if (ai.fischer == ai.constants.board.classicalFischer)
				$('#acui_default').click();
			else
				$('#acui_fischer_current').click();
		}
		else
		{
			if (ai.hasSetUp())
			{
				ui_move = '';
				$('#acui_input').val(ai.getInitialPosition());
				$('#acui_fen_load').click();
				acui_autostart();
			}
			else
				$('#acui_default').click();
		}
	});

	$('#acui_fen_load').click(function() {
		var player;
		if (!ai.loadFen($('#acui_input').val()))
		{
			acui_popup('The FEN cannot be loaded because it has a wrong format.');
			return false;
		}
		else
		{
			player = ai.getPlayer();
			ui_move = '';
			ui_possibledraw = false;
			acui_reset_ui(true);
			acui_refresh_board();
			$('#acui_tab_board_header').trigger('click');
			$('#acui_player').val(player).change();
			if (ai.fischer !== null)
			{
				$('#acui_option_fischer').val(ai.fischer).change();
				if (ai.fischer != ai.constants.board.classicalFischer)
					acui_popup('You are playing AntiChess ' + ai.fischer + '.');
			}
			return true;
		}
	});

	$('#acui_fen_gen').click(function() {
		$('#acui_input').val(ai.toFen()).focus().click();
		return true;
	});

	$('#acui_lichess_load').click(function() {
		var player;
		if (!ai.loadLichess($('#acui_input').val()))
		{
			acui_popup('The game cannot be retrieved from Lichess.org. Please never abuse.');
			return false;
		}
		else
		{
			$('#acui_tab_board_header').trigger('click');
			$('#acui_board').html('Please wait few seconds while the game is loaded...');
			setTimeout(	function() {
							player = ai.getPlayer();
							ui_move = '';
							ui_possibledraw = false;
							acui_reset_ui(true);
							acui_refresh_board();
							acui_refresh_history(true);
							$('#acui_player').val(player).change();
							if (ai.fischer !== null)
							{
								$('#acui_option_fischer').val(ai.fischer).change();
								if (ai.fischer != ai.constants.board.classicalFischer)
									acui_popup('You are playing AntiChess ' + ai.fischer + '.');
							}
						}, 5000);				//5 seconds are arbitrary
			return true;
		}
	});

	$('#acui_text_gen').click(function() {
		$('#acui_input').val(ai.toText()).focus().click();
		return true;
	});

	$('#acui_free').click(function() {
		ai.freeMemory();
		return true;
	});

	$('#acui_about').click(function() {
		setTimeout(function() {
				window.location = 'https://github.com/ecrucru/anticrux/';
			}, 1000);
		return true;
	});

	//-- Events (Options)
	$('#acui_option_predef').change(function() {
		ai.setLevel(parseInt($('#acui_option_predef').val()));
		acui_options_load();
		$("input[type='checkbox']").checkboxradio('refresh');
		return true;
	});

	$('#acui_option_maxreply').change(function() {
		$('#acui_option_minimizeliberty').prop('checked', true).checkboxradio('refresh');
		return true;
	});

	$('#acui_option_fischer').dblclick(function() {
		$('#acui_option_fischer').val(ai.getNewFischerId()).change();
		return true;
	});

	$('#acui_option_pro').change(function() {
		if ($('#acui_option_pro').prop('checked'))
			$('#acui_option_assistance').prop('checked', false).checkboxradio('refresh');
		return true;
	});

	$('.AntiCrux-ui-option').change(function() {
		//-- Common elements
		ai.options.board.darkTheme = $('#acui_option_darktheme').prop('checked');
		ai.options.board.rotated = $('#acui_option_rotated').prop('checked');

		//-- Mobile version
		if (ui_mobile)
			ai.setLevel(parseInt($('#acui_option_level').val()));
		else
		//-- Desktop version
		{
			//- AI
			ai.options.ai.maxDepth				= parseInt($('#acui_option_maxdepth').val());
			ai.options.ai.maxNodes				= parseInt($('#acui_option_maxnodes').val());
			ai.options.ai.minimizeLiberty		= $('#acui_option_minimizeliberty').prop('checked');
			ai.options.ai.maxReply				= parseInt($('#acui_option_maxreply').val());
			ai.options.ai.wholeNodes			= $('#acui_option_wholenodes').prop('checked');
			ai.options.ai.randomizedSearch		= $('#acui_option_randomizedsearch').prop('checked');
			ai.options.ai.pessimisticScenario	= $('#acui_option_pessimisticscenario').prop('checked');
			ai.options.ai.bestStaticScore		= $('#acui_option_beststaticscore').prop('checked');
			ai.options.ai.opportunistic			= $('#acui_option_opportunistic').prop('checked');
			ai.options.ai.handicap				= parseInt($('#acui_option_handicap').val());
			ai.options.ai.acceleratedEndGame	= $('#acui_option_acceleratedendgame').prop('checked');
			ai.options.ai.oyster				= $('#acui_option_oyster').prop('checked');

			//- Board
			ai.options.board.fischer			= parseInt($('#acui_option_fischer').val());
			ai.options.board.assistance			= $('#acui_option_assistance').prop('checked');
			ai.options.board.symbols			= $('#acui_option_symbol').prop('checked');
			ai.options.board.coordinates		= $('#acui_option_coordinates').prop('checked');
			ai.options.board.noStatOnForcedMove	= $('#acui_option_nostatonforcedmove').prop('checked');
			ai.options.board.noStatOnOwnMove	= $('#acui_option_nostatonownmove').prop('checked');
			ai.options.board.debugCellId		= $('#acui_option_debugcellid').prop('checked');

			//- Variant
			ai.options.variant.enPassant		= $('#acui_option_enpassant').prop('checked');
			ai.options.variant.promoteQueen		= $('#acui_option_promotequeen').prop('checked');
			ai.options.variant.pieces			= parseInt($('#acui_option_pieces').val());
		}
		return true;
	});

	$('.AntiCrux-ui-option-refresh').change(function() {
		acui_refresh_board();
		if ($('#acui_option_pro').prop('checked'))
			$('#acui_sect_eval').hide();
		else
			$('#acui_sect_eval').show();
		return true;
	});

	$('#acui_option_darktheme').change(function() {
		$('#acui_page').removeClass('ui-page-theme-a ui-page-theme-b').addClass('ui-page-theme-' + (ai.options.board.darkTheme?'b':'a'));
		$('#acui_rewind, #acui_switch_ui').removeClass('ui-btn-a ui-btn-b').addClass('ui-btn-' + (ai.options.board.darkTheme?'a':'b'));
		$('#acui_lastmove, #acui_assistance').html('');
	});

	$('#acui_option_level').change(function() {
		//-- ELO rating
		$('#acui_sect_level_header').html('Level' + (ai.options.ai.elo>0 ? ' ('+ai.options.ai.elo+')' : ''));

		//-- Warning
		if ($('#acui_option_level').val() >= 13)
			$('#acui_sect_level_notice').show();
		else
			$('#acui_sect_level_notice').hide();
	});

	//-- Default elements
	$('#acui_js, #acui_sect_rewind, #acui_sect_level_notice').hide();
	if ((ui_mobile && acui_isphone()) || (!ui_mobile && !acui_isphone()))
		$('#acui_switch_ui').hide();
	if (ui_mobile)
		acui_options_load();
	else
		$('#acui_option_predef').val(5).change();
	$('#acui_version').html(ai.options.ai.version);
	$(document).on('selectstart', false);				//No text selection to avoid moving the pieces on the screen (not supported)
});
