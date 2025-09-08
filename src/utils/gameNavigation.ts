/**
 * Game Navigation Utilities
 * Provides generic navigation helpers for all games
 */

import { NavigationProp } from '@react-navigation/native';

export interface GameNavigationOptions {
  /**
   * Number of screens to go back to reach the games list
   * Default: 2 (Game -> GamePayload -> Games)
   */
  stepsBack?: number;
  /**
   * Delay between navigation steps in milliseconds
   * Default: 100ms
   */
  navigationDelay?: number;
  /**
   * Callback to execute before navigation
   */
  beforeNavigate?: () => void;
  /**
   * Callback to execute after navigation
   */
  afterNavigate?: () => void;
}

export class GameNavigationHelper {
  /**
   * Navigate back to the games page from any game
   * @param navigation React Navigation object
   * @param options Navigation options
   */
  static exitToGamesList(
    navigation: NavigationProp<any>, 
    options: GameNavigationOptions = {}
  ): void {
    const {
      stepsBack = 2,
      navigationDelay = 100,
      beforeNavigate,
      afterNavigate
    } = options;

    console.log(`🚪 Exiting game - navigating back ${stepsBack} steps`);
    
    beforeNavigate?.();

    // Navigate back the specified number of steps
    this.navigateBackMultipleSteps(navigation, stepsBack, navigationDelay)
      .then(() => {
        afterNavigate?.();
        console.log('✅ Successfully navigated back to games list');
      })
      .catch((error) => {
        console.error('❌ Error during navigation:', error);
        // Fallback: try simple goBack
        navigation.goBack();
      });
  }

  /**
   * Navigate back multiple steps with delays
   * @param navigation React Navigation object
   * @param steps Number of steps to go back
   * @param delay Delay between steps
   */
  private static navigateBackMultipleSteps(
    navigation: NavigationProp<any>, 
    steps: number, 
    delay: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let currentStep = 0;
        
        const performStep = () => {
          if (currentStep >= steps) {
            resolve();
            return;
          }
          
          navigation.goBack();
          currentStep++;
          
          if (currentStep < steps) {
            setTimeout(performStep, delay);
          } else {
            resolve();
          }
        };
        
        performStep();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle game end with navigation back to games list
   * @param navigation React Navigation object
   * @param score Final game score
   * @param options Navigation options
   */
  static handleGameEnd(
    navigation: NavigationProp<any>,
    score?: number,
    options: GameNavigationOptions = {}
  ): void {
    console.log(`🎮 Game ended with score: ${score}`);
    
    this.exitToGamesList(navigation, {
      ...options,
      beforeNavigate: () => {
        options.beforeNavigate?.();
        if (score !== undefined) {
          console.log(`📊 Final Score: ${score}`);
        }
      }
    });
  }

  /**
   * Handle game error with navigation back to games list
   * @param navigation React Navigation object
   * @param error Error message or object
   * @param options Navigation options
   */
  static handleGameError(
    navigation: NavigationProp<any>,
    error: any,
    options: GameNavigationOptions = {}
  ): void {
    console.error('🚨 Game error occurred:', error);
    
    this.exitToGamesList(navigation, {
      ...options,
      beforeNavigate: () => {
        options.beforeNavigate?.();
        console.error('Game error details:', error);
      }
    });
  }

  /**
   * Handle manual game exit (back button press)
   * @param navigation React Navigation object
   * @param options Navigation options
   */
  static handleGameExit(
    navigation: NavigationProp<any>,
    options: GameNavigationOptions = {}
  ): void {
    console.log('🔙 User manually exiting game');
    
    this.exitToGamesList(navigation, {
      ...options,
      beforeNavigate: () => {
        options.beforeNavigate?.();
        console.log('Manual game exit initiated');
      }
    });
  }
}

// Export convenience functions for direct use
export const exitToGamesList = GameNavigationHelper.exitToGamesList.bind(GameNavigationHelper);
export const handleGameEnd = GameNavigationHelper.handleGameEnd.bind(GameNavigationHelper);
export const handleGameError = GameNavigationHelper.handleGameError.bind(GameNavigationHelper);
export const handleGameExit = GameNavigationHelper.handleGameExit.bind(GameNavigationHelper);