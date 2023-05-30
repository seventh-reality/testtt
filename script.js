
/**
 * This class is in charge of handling the interaction with the AR experience through the EmbedSDK.
 */
 class OxExperience {
  /**
   * The diferents points of the game
   */
  pointsTable = null;

  /**
   * Indicates if the robot is going to pick up a nut
   */
  goingForNut = false;

  /**
   * Indicates if the nut is the type gold
   */
  clickedGoldNNut = false;

  /**
   * Array of the diferents positions of the gold nut
   */
  gold_nut_position = [];

  /**
   * Number of nuts showed
   */
  nuts = 0;

  /**
   * Number of nuts actives
   */
  nuts_in_screen = 0;

  /**
   * Game time
   */
  time = 60

  /**
   * Points for catch a nut
   */
  chunks = [
      { chunk: 100, points: 50 }
  ];

  /**
   * Points for catching the nut
   */
  defaultPoints = 50;

  /**
   * Time in which a nut a ppears
   */
  time_per_nut = 1000;

  /**
   * Number of gold nuts you want
   */
  number_gold_nuts = 6;

  /**
   * Time it takes for a non-clicked nut to disappear
   */
  time_disappear_nut = 5000;
  
  /**
   * Time it takes for a non-clicked gold nut to disappear
   */
  time_disappear_gold_nut = 3000;
  
  /**
   * Background music
   */
  bckSound = 'onir-ix-theme_v2';
  
  /**
   * Music when you pick up a normal nut
   */
  metal_nut_sound = 'metal-nut-catch';
  
  /**
   * Music when you pick up a gold nut
   */
  gold_nut_sound = 'golden-nut-catch';
  
  /**
   * Music when the robot is moving
   */
  move_sound = 'roll';

  /**
   * Names of the elements in the AR experience.
   */
  ROBOT_ELEMENT_NAME = "robot_onirix";
  START_NUT_NAME = "onirix_nut_x";
  GOLD_NUT_NAME = "onirix_nut_x5_GOLD";

  /**
   * Robot element animations
   */
  robot_state = {
      brake: { name: "Animation.Stop", duration: 2 },
      wakeUp: { name: "Animation.1(On)", duration: 4.291666507720947 },
      lookAround: { name: "Animation.2(LookAround)", duration: 8.25 },
      circuit: { name: "Animation.3(Tour)", duration: 10.416666984558105 },
      defuse: { name: "Animation.4(Off)", duration: 0.9583333134651184 },
      startUp: { name: "Animation.Start", duration: 1 },
      standarAnimation: { name: "Animation.Standar", duration: 1 },
      onirixAnimation: { name: "Onir-IX_animation", duration: 23.83333396911621 }
  }

  /**
   * Nut element animations
   */
  nut_state = {
      pickUp: { name: "PickUp.1", duration: 1 },
      spawn1: { name: "Spawn.1", duration: 1.3333333730697632 },
      spawn2: { name: "Spawn.2", duration: 1.3333333730697632 }
  }

  /**
   * State of the nuts
   */
  nut_group = {
      onirix_nut_x: { screen: true, clicked: false },
      onirix_nut_x1: { screen: false, clicked: false },
      onirix_nut_x2: { screen: false, clicked: false },
      onirix_nut_x3: { screen: false, clicked: false },
      onirix_nut_x4: { screen: false, clicked: false }

  }

  /**
   * Constructor
   * Initialize the embedSDK and set points table
   * 
   * @param   embedsdk allows you to lister to events and control the scene content
   */
  constructor(embedSDK) {
      this.embedSDK = embedSDK;
      this.lastAnimation = new Map();
      if (this.chunks && this.chunks.length > 0) {
          this.pointsTable = this.chunks.map(chunk => {
              return {
                  seconds: Math.floor(chunk.chunk * (this.time) / 100),
                  points: chunk.points
              }
          });
          this.pointsTable.sort((a, b) => a.seconds - b.seconds);
      } else {
          this.pointsTable = [{ seconds: this.time, points: this.defaultPoints }];
      }
  }

  /**
   * Determinates if the nut is gold or no
   * 
   * @param   name of he nut
   * @return  true if the nut is gold, if not false
   */
  isGoldNut(name) {
      return name == this.GOLD_NUT_NAME;
  }

  /**
   * Get the time of the game from CONFIG
   * 
   * @return  time the game should last
   */
  getTime() {
      return this.time;
  }

  /**
   * Play the background sound
   */
  playBackgroundSound() {
      this.embedSDK.play(this.bckSound);
  }

  /**
   * Stop the background sound
   */
  pauseBackgroundSound() {
      this.embedSDK.pause(this.bckSound);
  }

  /**
   * Initialize the game
   */
  async init() {
      let num = 1;

      for (let i = 0; i < this.number_gold_nuts; i++) {
          while(this.gold_nut_position.some(pos => pos == num)){
              num = this.random(num, this.time / (this.number_gold_nuts - i));
          }

          this.gold_nut_position.push(num);
      }
      this.nuts++;
  }

  /**
   * Generate a random number between min and max
   * 
   * @internal
   * @param   min value for the random number
   * @param   max value for the random number
   * @return  random number
   */
  random(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
  }

  /**
   * Recursive method that causes a nut to appear every 4sec
   * 
   * @internal
   */
  async allNuts() {


      if (this.gold_nut_position.some(pos => pos == this.nuts)) {

          await this.rotate(this.GOLD_NUT_NAME);
          await this.recolate(this.GOLD_NUT_NAME);
          await this.appearsNut(this.GOLD_NUT_NAME, this.nut_state.spawn1);
          this.nuts++;
          this.clickedGoldNNut = false;
          window.setTimeout(() => this.checkRemoveGoldNut(this.GOLD_NUT_NAME), this.time_disappear_gold_nut);

      } else {
          for (let nut in this.nut_group) {
              if (this.nut_group[nut].screen == false) {
                  await this.rotate(nut);
                  await this.recolate(nut);
                  await this.appearsNut(nut, this.nut_state.spawn1);
                  this.nut_group[nut].screen = true;
                  this.nut_group[nut].clicked = false;

                  this.nuts++;
                  window.setTimeout(() => this.checkRemoveNut(nut), this.time_disappear_nut)

                  break;
              }

          }
      }

      window.setTimeout(() => this.allNuts(), this.time_per_nut)
  }

  /**
   * Hide the nut from the screen
   * 
   * @internal
   * @param nut to disabled
   */
  async checkRemoveNut(nut) {
      if (this.nut_group[nut].screen && !this.nut_group[nut].clicked) {
          this.embedSDK.disable(nut);
          this.nut_group[nut].screen = false;
      }
  }

  /**
   * Hide the gold nut from the screen
   * 
   * @internal
   * @param gold nut to disabled
   */
  async checkRemoveGoldNut(nut) {
      if (!this.clickedGoldNNut) {
          this.embedSDK.disable(nut);
      }
  }

  /**
   * Starts the game
   */
  async startGame() {
      window.setTimeout(() => this.allNuts(), this.time_per_nut)
  }

  /**
   * Execute animations forcing you to wait for your animation time
   * 
   * @internal
   * @param name       name of the element where we want the animation to be applied.
   * @param animation  name of the animation that we want to run.
   * @param loop       if we want the animation to run in a loop, by default it always takes the false value.
   */
  async playAnimation(name, animation, loop = false) {
      if (this.lastAnimation.has(name)) {
          this.embedSDK.stopAnimation(name, this.lastAnimation.get(name));
      }

      this.lastAnimation.set(name, animation);
      this.embedSDK.playAnimation(name, animation.name, loop);

      await this.sleep(animation.duration * 1000);
  }

  /**
   * Makes a nut appear
   * 
   * @internal
   * @param name       name of the nut where we want the animation to be applied.
   * @param animation  name of the animation that we want to run.
   * @param loop       if we want the animation to run in a loop, by default it always takes the false value.
   */
  async appearsNut(nutName, animation, loop = false) {

      this.embedSDK.enable(nutName);
      await this.playAnimation(nutName, animation, loop);

  }

  /**
   * Check if the robot is going to pick up a nut
   * 
   * @return  true if the robot is going to pick up a nut, if not false
   */
  isGoingForNut() {
      return this.goingForNut;
  }

  /**
   * Logic related to clicking on a nut
   * 
   * @param   params info related with the clicked nut
   */
  async clickNut(params) {

      if (!this.goingForNut) {
          this.goingForNut = true;

          if (params.name == this.GOLD_NUT_NAME) {
              this.clickedGoldNNut = true;
          }

          for (var nut in this.nut_group) {
              if (nut == params.name) {
                  this.nut_group[nut].clicked = true;
                  break;
              }
          }

          this.embedSDK.play(this.move_sound);
          
          this.embedSDK.translateToElement(this.ROBOT_ELEMENT_NAME, params.oid, 1, true, false);
          this.playAnimation(this.ROBOT_ELEMENT_NAME, this.robot_state.startUp);
          await this.sleep(1000);
          this.embedSDK.pause(this.move_sound);


          if (params.name == this.GOLD_NUT_NAME) {
              this.embedSDK.play(this.gold_nut_sound);
          } else {
              this.embedSDK.play(this.metal_nut_sound);

          }
          this.embedSDK.stopAnimation(this.ROBOT_ELEMENT_NAME);

          this.playAnimation(this.ROBOT_ELEMENT_NAME, this.robot_state.brake);

          await this.playAnimation(params.name, this.nut_state.pickUp, false);
          this.embedSDK.stopAnimation(params.name, this.nut_state.pickUp.name);

          this.embedSDK.disable(params.name);

          for (var nut in this.nut_group) {
              if (nut == params.name) {
                  this.nut_group[nut].screen = false;
                  break;
              }
          }

          this.goingForNut = false;
      }

  }

  /**
   * Position the nut in a ramdom place
   * 
   * @internal
   * @param   name of he nut that must appear
   */
  async recolate(name) {

      let randomnumX = Math.random();
      let plusOrMinusX = Math.random() < 0.5 ? -1 : 1;

      let randomnumZ = Math.random();
      let plusOrMinusZ = Math.random() < 0.5 ? -1 : 1;

      let numX = randomnumX * plusOrMinusX;
      let numY = 0.0005;
      let numZ = randomnumZ * plusOrMinusZ;


      this.embedSDK.translate(name, numX, numY, numZ);
  }

  /**
   * Rotate the nut to its base position
   * 
   * @internal
   * @param   name of he nut that must appear
   */
  async rotate(name) {
      this.embedSDK.rotate(name, 0, 0, 0);
  }

  /**
   * Keeps the program waiting for as long as inscrusted
   * 
   * @internal
   * @param   ms time in milliseconds that you want the program to stop
   * @return  promise
   */
  async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the number of points
   * 
   * @param   time
   * @return  number of points a nut is worth
   */
  getPoints(currentTime) {
      const elapsedTime = this.time - currentTime;
      const points = this.pointsTable.find(chunk => chunk.seconds > elapsedTime);
      if (points) {
          return points.points;
      } else {
          return this.defaultPoints;
      }
  }
}


/**
* This class is in charge of handling the interaction with the custom html and css code.
*/
class OxExperienceUI {
  /**
   * HTML elements ids
   */
  TOP_CATCHED = 'ox-game-top__catched';
  GAME_TOP = 'ox-game-top';
  CLOCK_SECONDS = 'ox-game-clock__seconds';
  GAME_CLOCK = 'ox-game-clock';
  CLOCK = "clock";
  RESUME_GAME = 'ox-resume-game';

  BANNER = 'banner';
  ENDGAME = 'endgame';
  RESUME = "resume-all-game";

  GAME_POINTS = 'ox-end__game-points';
  GAME_NUTS = 'ox-end__game-nuts';

  GAME_MSG = 'ox-game-msg';
  CLOCK_ENDING = 'ox-game-clock--ending';

  GAME_SCORE = 'ox-game-score';
  GAME_TOP_CATCHED = 'ox-game-top__catched';

  SHARE_BUTTON = "share-button";
  PLAY_AGAIN = "play-again";

  MIN_SECOND = 11;

  OX_AUDIO = 'ox-audio';
  CLOSE = 'ox-audio__close';

  /**
   * Data to share
   */
  shareData = {
      title: 'Onir-IX: the nut-picker robot',
      text: 'Try our new experience: nut-picker robot',
      url: 'https://studio.onirix.com/exp/eMbnOl'
  }

  /**
   * Indicates if the game is in the last 10 seconds of the time
   */
  last_10_seconds = false;

  /**
   * Points achived
   */
  score = 0;

  /**
   * Time counter
   */
  time = 60;

  /**
   * Interval of time
   */
  timeInterval = null;

  /**
   * Indicates if the game is running
   */
  inProgress = false;

  /**
   * Number of nuts catched
   */
  catched = 0;
  
  /**
   * Callback called when the game end
   */
  onGameEnd=null;
  
  /**
   * Callback called when need points for each nut
   */
  onGetPoints=null;
  
  /**
   * Callback called when want to know if the nut clicked is gold
   */
  onIsGold=null;
  
  /**
   * Callback called when need to know if the robot is going to pick up a nut
   */
  onIsGoingForNut=null;
  
  /**
   * Callback called when need the game time
   */
  onGetTime=null;

  /**
   * Indicates the time that the toast is available
   */
  availableTime = 3000;

  /**
   * Enable info bar
   */
  showInitBar() {
      document.getElementById(this.GAME_TOP).style.display = 'flex';
      document.getElementById(this.GAME_MSG).style.display = 'flex';
  }

  /**
   * Functionality of the final screen
   */
  finalScreen() {
      /*
      document.getElementById(this.SHARE_BUTTON).addEventListener("click", () => {
          navigator['share'](this.shareData);
      });

      document.getElementById(this.PLAY_AGAIN).addEventListener("click", () => {
          location.reload();
      });
      */
  }

  /**
   * Shows init screen
   */
  initUI() {
      document.getElementById(this.SHARE_BUTTON).addEventListener("click", () => {
          navigator['share'](this.shareData);
      });

      document.getElementById(this.PLAY_AGAIN).addEventListener("click", () => {
          location.reload();
      });


      this.inProgress = true;
      document.getElementById(this.TOP_CATCHED).innerHTML = `0`;
      document.getElementById(this.CLOCK_SECONDS).innerHTML = `${this.onGetTime()}s`;
      document.getElementById(this.GAME_CLOCK).style.display = 'flex';
      document.getElementById(this.RESUME_GAME).style.display = 'flex';

      this.scoreChange();

      this.timeChange(this.time);
      this.timeInterval = window.setInterval(() => {
          this.time--;
          this.timeChange(this.time)
          if (0 >= this.time) {
              this.inProgress = false;
              this.gameEnd(this.score, this.catched);
              window.clearInterval(this.timeInterval);
          }
      }, 1000);
  }

  /**
   * Enable final screen
   * 
   * @internal
   * @param   points achived
   * @param   nuts catched
   */
  showOnirixEnd(points, catched) {
      document.getElementById(this.BANNER).style.display = 'block';
      document.getElementById(this.ENDGAME).style.display = 'block';
      document.getElementById(this.RESUME).style.display = 'flex';
      document.getElementById(this.GAME_POINTS).innerHTML = `${points}pts`;
      document.getElementById(this.GAME_NUTS).innerHTML = `${catched}`;
  }

  /**
   * Hide info bar and start the game
   */
  start() {
      document.getElementById(this.GAME_MSG).style.display = 'none';
  }

  /**
   * Update screen time
   * 
   * @internal
   * @param   time elapsed
   */
  timeChange(currentTime) {
      document.getElementById(this.CLOCK_SECONDS).innerHTML = `${currentTime}s`;
      if (this.MIN_SECOND > currentTime && !this.last_10_seconds) {
          this.last_10_seconds = true;
          const clock = document.getElementById(this.CLOCK);
          clock.classList.remove(this.CLOCK);
          clock.classList.add(this.CLOCK_ENDING);
      }
  }

  /**
   * Update screen achived
   * 
   * @internal
   */
  scoreChange() {
      document.getElementById(this.GAME_SCORE).innerHTML = `${this.score} pts`;
      document.getElementById(this.GAME_TOP_CATCHED).innerHTML = `${this.catched}`;
  }

  /**
   * Enable game end
   * 
   * @internal
   * @params  points achived
   * @param   nuts catched
   */
  gameEnd(points, catched) {
      this.showOnirixEnd(points, catched);
      this.onGameEnd();
  }

  /**
   * Update the number of points and nuts catched
   * 
   * @param   params info about the clicked nut
   */
  async updateCatched(params) {
      if (!this.onIsGoingForNut()) {
          this.catched++;
          const points = await this.onGetPoints(this.time);
          this.score += points;
          if (await this.onIsGold(params.name)) {
              this.score += points;
          }
          this.scoreChange();
      }
      
  }

  /**
   * Enable audio toast
   */
  toggleAudioToast() {
      document.getElementById(this.OX_AUDIO).style.display = 'block';
      setTimeout(() => {
          document.getElementById(this.OX_AUDIO).style.display = 'none';
      }, this.availableTime);

      document.getElementById(this.CLOSE).addEventListener('click',() => {
          document.getElementById(this.OX_AUDIO).style.display = 'none';
      })
  }
}

/**
* Onirix Embed SDK allows you to listen to events and control the scene when embedding experiences in a custom domain or from the online code editor.
* For more information visit https://docs.onirix.com/onirix-sdk/embed-sdk
*/
import OnirixEmbedSDK from "https://unpkg.com/@onirix/embed-sdk@1.2.3/dist/ox-embed-sdk.esm.js";
const embedSDK = new OnirixEmbedSDK();
await embedSDK.connect();
const oxExperience = new OxExperience(embedSDK);
const oxExperienceUi = new OxExperienceUI();
oxExperienceUi.finalScreen();
let start = false;

  /**
   * Comunicates oxExperience UI and oxExperience to stop the background sound when the game ends
   */
  oxExperienceUi.onGameEnd = async () => {
      oxExperience.pauseBackgroundSound();
  }

  /**
   * Comunicates oxExperience UI and oxExperience to get the points
   * 
   * @param   time to calculate the number of corresponding points
   * @return  points for each nut
   */
  oxExperienceUi.onGetPoints = async (time) => {
      return await oxExperience.getPoints(time);
  }

  /**
   * Comunicates oxExperience UI and oxExperience to know if the nut is gold
   * 
   * @param   name of the nut clicked
   * @return  true if the nut is gold, if not false
   */
  oxExperienceUi.onIsGold = async (name) => {
      return await oxExperience.isGoldNut(name);
  }

  /**
   * Comunicates oxExperience UI and oxExperience to know if the robot is going to pick up a nut
   * 
   * @return  true if the robot is going to pickup a nut, if not false
   */
  oxExperienceUi.onIsGoingForNut = () => {
      return oxExperience.isGoingForNut();
  }

  /**
   * Comunicates oxExperience UI and oxExperience to get the time
   * 
   * @return  time the game should last
   */
  oxExperienceUi.onGetTime = () => {
      return oxExperience.getTime();
  }

  /**
   * It's execute when the scene is totally load and it start the game
   */
  embedSDK.subscribe(OnirixEmbedSDK.Events.SCENE_LOAD_END, async (params) => {
      oxExperienceUi.showInitBar();
      oxExperienceUi.toggleAudioToast();
      await oxExperience.init();
      oxExperience.playBackgroundSound();
  });

  /**
   * It's execute when a element of the scene is clicked. Start the game or sum points.
   */
  embedSDK.subscribe(OnirixEmbedSDK.Events.ELEMENT_CLICK, async (params) => {
      if (!start) {
          oxExperienceUi.start();
          oxExperience.startGame();
          oxExperienceUi.initUI(),
          start = true;
      }

      if (params.name.includes('nut')) {
          await oxExperience.clickNut(params);
          oxExperienceUi.updateCatched(params);
      }
  });