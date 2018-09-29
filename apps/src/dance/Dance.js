import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  outputError,
} from '../lib/util/javascriptMode';
var msg = require('@cdo/gamelab/locale');
import CustomMarshalingInterpreter from '../lib/tools/jsinterpreter/CustomMarshalingInterpreter';

import * as apiTimeoutList from '../lib/util/timeoutList';
var GameLabP5 = require('./GameLabP5');
import {
  onSubmitComplete
} from '../submitHelper';
var dom = require('../dom');
import {getStore} from '../redux';
var GameLabView = require('./GameLabView');
var Provider = require('react-redux').Provider;
import Sounds from '../Sounds';
import {TestResults, ResultType} from '../constants';
import {createDanceAPI} from './DanceLabP5';
import initDance from './p5.dance';

/**
 * An instantiable GameLab class
 * @constructor
 * @implements LogTarget
 */
var Dance = function () {
  this.skin = null;
  this.level = null;
  this.tickIntervalId = 0;
  this.tickCount = 0;

  /** @type {StudioApp} */
  this.studioApp_ = null;

  /** @type {JSInterpreter} */
  this.JSInterpreter = null;

  this.eventHandlers = {};
  this.Globals = {};
  this.interpreterStarted = false;
  this.gameLabP5 = new GameLabP5();
};

module.exports = Dance;

/**
 * Inject the studioApp singleton.
 */
Dance.prototype.injectStudioApp = function (studioApp) {
  this.studioApp_ = studioApp;
  this.studioApp_.reset = this.reset.bind(this);
  this.studioApp_.runButtonClick = this.runButtonClick.bind(this);

  this.studioApp_.setCheckForEmptyBlocks(true);
};

/**
 * Initialize Blockly and this GameLab instance.  Called on page load.
 * @param {!AppOptionsConfig} config
 * @param {!GameLabLevel} config.level
 */
Dance.prototype.init = function (config) {
  if (!this.studioApp_) {
    throw new Error("GameLab requires a StudioApp");
  }

  this.level = config.level;
  this.skin = config.skin;

  const MEDIA_URL = '/blockly/media/spritelab/';
  this.skin.smallStaticAvatar = MEDIA_URL + 'avatar.png';
  this.skin.staticAvatar = MEDIA_URL + 'avatar.png';
  this.skin.winAvatar = MEDIA_URL + 'avatar.png';
  this.skin.failureAvatar = MEDIA_URL + 'avatar.png';

  // injectErrorHandler(new BlocklyModeErrorHandler(
  //   () => this.JSInterpreter,
  //   null,
  // ));

  this.level.helperLibraries = this.level.helperLibraries || [];
  this.isDanceLab = this.level.helperLibraries.some(name => name === 'DanceLab');

  this.level.softButtons = this.level.softButtons || {};
  if (this.level.startAnimations && this.level.startAnimations.length > 0) {
    try {
      this.startAnimations = JSON.parse(this.level.startAnimations);
    } catch (err) {
      console.error("Unable to parse default animation list", err);
    }
  }

  this.studioApp_.labUserId = config.labUserId;

  this.gameLabP5.init({
    gameLab: this,
    onExecutionStarting: this.onP5ExecutionStarting.bind(this),
    onPreload: this.onP5Preload.bind(this),
    onSetup: this.onP5Setup.bind(this),
    onDraw: this.onP5Draw.bind(this)
  });

  config.afterClearPuzzle = function () {
    this.studioApp_.resetButtonClick();
  }.bind(this);

  config.appMsg = msg;

  // hide makeYourOwn on the share page
  config.makeYourOwn = false;

  config.centerEmbedded = false;
  config.wireframeShare = true;
  config.responsiveEmbedded = true;
  config.noHowItWorks = true;

  // Display CSF-style instructions when using Blockly. Otherwise provide a way
  // for us to have top pane instructions disabled by default, but able to turn
  // them on.
  config.noInstructionsWhenCollapsed = !this.studioApp_.isUsingBlockly();

  config.enableShowCode = true;
  config.enableShowLinesCount = false;

  const onMount = () => {
    config.loadAudio = this.loadAudio_.bind(this);
    config.afterInject = this.afterInject_.bind(this, config);

    // Store p5specialFunctions in the unusedConfig array so we don't give warnings
    // about these functions not being called:
    config.unusedConfig = this.gameLabP5.p5specialFunctions;

    if (this.studioApp_.isUsingBlockly()) {
      // Custom blockly config options for game lab jr
      config.valueTypeTabShapeMap = Dance.valueTypeTabShapeMap(Blockly);
    }

    this.studioApp_.init(config);

    var finishButton = document.getElementById('finishButton');
    if (finishButton) {
      dom.addClickTouchEvent(finishButton, () => this.onPuzzleComplete(false));
    }
  };

  var showFinishButton = !this.level.isProjectLevel && !this.level.validationCode;
  var finishButtonFirstLine = _.isEmpty(this.level.softButtons);

  this.studioApp_.setPageConstants(config, {
    channelId: config.channel,
    isProjectLevel: !!config.level.isProjectLevel,
    isSubmittable: !!config.level.submittable,
    isSubmitted: !!config.level.submitted
  });

  ReactDOM.render((
    <Provider store={getStore()}>
      <GameLabView
        showFinishButton={finishButtonFirstLine && showFinishButton}
        onMount={onMount}
        danceLab={this.isDanceLab}
      />
    </Provider>
  ), document.getElementById(config.containerId));
};

Dance.prototype.loadAudio_ = function () {
  this.studioApp_.loadAudio(this.skin.winSound, 'win');
  this.studioApp_.loadAudio(this.skin.startSound, 'start');
  this.studioApp_.loadAudio(this.skin.failureSound, 'failure');
};

/**
 * Code called after the blockly div + blockly core is injected into the document
 */
Dance.prototype.afterInject_ = function (config) {
  if (this.studioApp_.isUsingBlockly()) {
    // Add to reserved word list: API, local variables in execution evironment
    // (execute) and the infinite loop detection function.
    Blockly.JavaScript.addReservedWords([
      'code',
      'validationState',
      'validationResult',
      'validationProps',
      'levelSuccess',
      'levelFailure',
    ].join(','));

    // Don't add infinite loop protection
    Blockly.JavaScript.INFINITE_LOOP_TRAP = '';
  }
};

Dance.prototype.haltExecution_ = function () {
  this.eventHandlers = {};
  this.stopTickTimer();
  this.tickCount = 0;
};

Dance.prototype.isTickTimerRunning = function () {
  return this.tickIntervalId !== 0;
};

Dance.prototype.stopTickTimer = function () {
  if (this.tickIntervalId !== 0) {
    window.clearInterval(this.tickIntervalId);
    this.tickIntervalId = 0;
  }
};

Dance.prototype.startTickTimer = function () {
  if (this.isTickTimerRunning()) {
    console.warn('Tick timer is already running in startTickTimer()');
  }
  // Set to 1ms interval, but note that browser minimums are actually 5-16ms:
  const fastPeriod = 1;
  // Set to 100ms interval when we are in the experiment with the speed slider
  // and the slider has been slowed down (we only support two speeds for now):
  const slowPeriod = 100;
  const intervalPeriod = this.gameLabP5.stepSpeed < 1 ? slowPeriod : fastPeriod;
  this.tickIntervalId = window.setInterval(this.onTick.bind(this), intervalPeriod);
};

/**
 * Reset GameLab to its initial state.
 */
Dance.prototype.reset = function () {
  this.haltExecution_();

  apiTimeoutList.clearTimeouts();
  apiTimeoutList.clearIntervals();
  Sounds.getSingleton().stopAllAudio();

  this.gameLabP5.resetExecution();

  // Discard the interpreter.
  // if (this.JSInterpreter) {
  //   this.JSInterpreter.deinitialize();
  //   this.JSInterpreter = null;
  //   this.interpreterStarted = false;
  // }
  this.executionError = null;
};

Dance.prototype.onPuzzleComplete = function (submit, testResult) {
  if (this.executionError) {
    this.result = ResultType.ERROR;
  } else {
    // In most cases, submit all results as success
    this.result = ResultType.SUCCESS;
  }

  // If we know they succeeded, mark levelComplete true
  const levelComplete = (this.result === ResultType.SUCCESS);

  if (this.executionError) {
    this.testResults = this.studioApp_.getTestResults(levelComplete, {
        executionError: this.executionError
    });
  } else if (testResult) {
    this.testResults = testResult;
  } else {
    this.testResults = TestResults.FREE_PLAY;
  }

  // Stop everything on screen
  this.reset();

  // We're using blockly, report the program as xml
  var xml = Blockly.Xml.blockSpaceToDom(Blockly.mainBlockSpace);
  let program = encodeURIComponent(Blockly.Xml.domToText(xml));

  if (this.testResults >= TestResults.FREE_PLAY) {
    this.studioApp_.playAudio('win');
  } else {
    this.studioApp_.playAudio('failure');
  }

  const sendReport = () => {
    const onComplete = submit ? onSubmitComplete : this.onReportComplete.bind(this);

    this.studioApp_.report({
      app: 'dance',
      level: this.level.id,
      result: levelComplete,
      testResult: this.testResults,
      submitted: submit,
      program: program,
      onComplete,
    });
  };

  sendReport();
};

/**
 * Function to be called when the service report call is complete
 * @param {MilestoneResponse} response - JSON response (if available)
 */
Dance.prototype.onReportComplete = function (response) {
  this.response = response;
  this.studioApp_.onReportComplete(response);
  this.displayFeedback_();
};

/**
 * Click the run button.  Start the program.
 */
Dance.prototype.runButtonClick = function () {
  this.studioApp_.toggleRunReset('reset');
  Blockly.mainBlockSpace.traceOn(true);
  this.studioApp_.attempts++;
  this.execute();

  // Enable the Finish button if is present:
  var shareCell = document.getElementById('share-cell');
  if (shareCell && !this.level.validationCode) {
    shareCell.className = 'share-cell-enabled';

    // Adding completion button changes layout.  Force a resize.
    this.studioApp_.onResize();
  }
};

Dance.prototype.execute = function () {
  this.result = ResultType.UNSET;
  this.testResults = TestResults.NO_TESTS_RUN;
  this.response = null;

  // Reset all state.
  this.reset();
  this.studioApp_.clearAndAttachRuntimeAnnotations();

  if (this.studioApp_.hasUnwantedExtraTopBlocks() || this.studioApp_.hasDuplicateVariablesInForLoops()) {
    // Immediately check answer, which will fail and report top level blocks.
    this.onPuzzleComplete(false);
    return;
  }

  this.gameLabP5.startExecution(this.isDanceLab);

  // if (!this.JSInterpreter ||
  //     !this.JSInterpreter.initialized() ||
  //     this.executionError) {
  //   return;
  // }
  //
  // this.startTickTimer();
};

Dance.prototype.initInterpreter = function () {

  // this.JSInterpreter = new JSInterpreter({
  //   studioApp: this.studioApp_,
  //   maxInterpreterStepsPerTick: MAX_INTERPRETER_STEPS_PER_TICK,
  //   shouldRunAtMaxSpeed: () => (this.gameLabP5.stepSpeed >= 1),
  //   customMarshalGlobalProperties: this.gameLabP5.getCustomMarshalGlobalProperties(),
  //   customMarshalObjectList: this.gameLabP5.getCustomMarshalObjectList(),
  // });
  //
  // this.JSInterpreter.onExecutionError.register(this.handleExecutionError.bind(this));

  const Dance = createDanceAPI(this.gameLabP5.p5);
  const nativeAPI = initDance(this.gameLabP5.p5, Dance);
  this.currentFrameEvents = nativeAPI.currentFrameEvents;
  const sprites = [];

  const api = {
    setBackground: color => {
      nativeAPI.setBackground(color.toString());
    },
    setBackgroundEffect: effect => {
      nativeAPI.setBackgroundEffect(effect.toString());
    },
    setForegroundEffect: effect => {
      nativeAPI.setForegroundEffect(effect.toString());
    },
    makeNewDanceSprite: (costume, name, location) => {
      return Number(sprites.push(nativeAPI.makeNewDanceSprite(costume, name, location)) - 1);
    },
    changeMoveLR: (spriteIndex, move, dir) => nativeAPI.changeMoveLR(sprites[spriteIndex], move, dir),
    doMoveLR: (spriteIndex, move, dir) => nativeAPI.doMoveLR(sprites[spriteIndex], move, dir),
    // TODO: ifDanceIs: function ifDanceIs(sprite, dance, ifStatement, elseStatement),

    // changeMoveEachLR: function changeMoveEachLR(group, move, dir),
    // doMoveEachLR: function doMoveEachLR(group, move, dir),
    // layoutSprites: function layoutSprites(group, format),
    // setTint: function setTint(sprite, val),

    setProp: (spriteIndex, property, val) => {
      nativeAPI.setProp(sprites[spriteIndex], property, val);
    },
    getProp: (spriteIndex, property, val) => {
      return nativeAPI.setProp(sprites[spriteIndex], property, val);
    },
    changePropBy: (spriteIndex, property, val) => {
      nativeAPI.changePropBy(sprites[spriteIndex], property, val);
    },
    jumpTo: (sprite, location) => {
      nativeAPI.jumpTo(sprite, location);
    },
    setDanceSpeed: (sprite, speed) => {
      nativeAPI.setDanceSpeed(sprite, speed);
    },
    getEnergy: range => {
      return Number(nativeAPI.getEnergy(range));
    },
    nMeasures: n => {
      return Number(nativeAPI.nMeasures(n));
    },
    getTime: unit => {
      return Number(nativeAPI.getTime(unit));
    },
    startMapping: (spriteIndex, property, val) => {
      return nativeAPI.startMapping(sprites[spriteIndex], property, val);
    },
    stopMapping: (spriteIndex, property, val) => {
      return nativeAPI.stopMapping(sprites[spriteIndex], property, val);
    },
    changeColorBy: () => {}, // TODO: function changeColorBy(input, method, amount),
    mixColors: () => {}, // TODO: function mixColors(color1, color2),
    randomColor: () => {}, // TODO: function randomColor(),
  };

  let code = require('!!raw-loader!./p5.dance.interpreted');
  code += this.studioApp_.getCode();

  const events = {
    runUserSetup: {code: 'runUserSetup();'},
    runUserEvents: {code: 'runUserEvents(events);', args: ['events']},
  };

  // this.JSInterpreter.parse({
  //   code,
  //   blockFilter: this.level.executePaletteApisOnly && this.level.codeFunctions,
  //   enableEvents: true,
  //   initGlobals: injectGamelabGlobals
  // });
  // if (!this.JSInterpreter.initialized()) {
  //   return;
  // }

  this.hooks = CustomMarshalingInterpreter.evalWithEvents(api, events, code).hooks;

  this.gameLabP5.p5specialFunctions.forEach(function (eventName) {
    this.eventHandlers[eventName] = nativeAPI[eventName];
  }, this);
};

Dance.prototype.onTick = function () {
  this.tickCount++;

  if (this.JSInterpreter) {
    if (this.interpreterStarted) {
      this.JSInterpreter.executeInterpreter();
    }
  }
};

/**
 * This is called while this.gameLabP5 is in startExecution(). We use the
 * opportunity to create native event handlers that call down into interpreter
 * code for each event name.
 */
Dance.prototype.onP5ExecutionStarting = function () {
  this.gameLabP5.p5eventNames.forEach(function (eventName) {
    this.gameLabP5.registerP5EventHandler(eventName, function () {
      if (this.eventHandlers[eventName]) {
        this.eventHandlers[eventName].apply(null);
      }
    }.bind(this));
  }, this);
};

/**
 * This is called while this.gameLabP5 is in the preload phase. Do the following:
 *
 * - load animations into the P5 engine
 * - initialize the interpreter
 * - start its execution
 * - (optional) execute global code
 * - call the user's preload function
 */
Dance.prototype.onP5Preload = function () {
    this.initInterpreter();
    // Execute the interpreter for the first time:

    //this.JSInterpreter.executeInterpreter(true);
    this.interpreterStarted = true;

    // In addition, execute the global function called preload()
    if (this.eventHandlers.preload) {
      this.eventHandlers.preload.apply(null);
    }
};

/**
 * This is called while this.gameLabP5 is in the setup phase. We restore the
 * interpreter methods that were modified during preload, then call the user's
 * setup function.
 */
Dance.prototype.onP5Setup = function () {
  //if (this.JSInterpreter) {
    // Re-marshal restored preload methods for the interpreter:
    // const preloadMethods = _.intersection(
    //   this.gameLabP5.p5._preloadMethods,
    //   this.gameLabP5.getMarshallableP5Properties()
    // );
    // for (const method in preloadMethods) {
    //   this.JSInterpreter.createGlobalProperty(
    //       method,
    //       this.gameLabP5.p5[method],
    //       this.gameLabP5.p5);
    // }

    if (this.eventHandlers.setup) {
      this.eventHandlers.setup.apply(null);
    }
    this.hooks.find(v => v.name === 'runUserSetup').func();
  //}
};

/**
 * This is called while this.gameLabP5 is in a draw() call. We call the user's
 * draw function.
 */
Dance.prototype.onP5Draw = function () {
  if (this.eventHandlers.draw) {
    if (getStore().getState().runState.isRunning) {
      if (this.currentFrameEvents.any) {
        this.hooks.find(v => v.name === 'runUserEvents').func(this.currentFrameEvents);
      }
      this.eventHandlers.draw.apply(null);
    }
  }
};

Dance.prototype.handleExecutionError = function (err, lineNumber, outputString) {
  outputError(outputString, lineNumber);
  if (err.native) {
    console.error(err.stack);
  }
  this.executionError = { err: err, lineNumber: lineNumber };
  this.haltExecution_();
};

/**
 * App specific displayFeedback function that calls into
 * this.studioApp_.displayFeedback when appropriate
 */
Dance.prototype.displayFeedback_ = function () {
  var level = this.level;

  this.studioApp_.displayFeedback({
    feedbackType: this.testResults,
    message: this.message,
    response: this.response,
    level: level,
    showingSharing: level.freePlay,
    saveToLegacyGalleryUrl: level.freePlay && this.response && this.response.save_to_gallery_url,
    appStrings: {
      reinfFeedbackMsg: msg.reinfFeedbackMsg(),
      sharingText: msg.shareGame()
    },
    hideXButton: true,
  });
};

Dance.valueTypeTabShapeMap = function (blockly) {
  return {
    [blockly.BlockValueType.SPRITE]: 'angle',
    [blockly.BlockValueType.BEHAVIOR]: 'rounded',
    [blockly.BlockValueType.LOCATION]: 'square',
  };
};
