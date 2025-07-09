/**
 * TypeScript definitions for GSAP CustomWiggle plugin
 * Based on CustomWiggle.js v3.11.0
 *
 * This file overrides the 'any' type from GSAP's built-in CustomWiggle types
 */

declare global {

  namespace CustomWiggle {
    /**
     * Configuration options for creating a CustomWiggle ease
     */
    interface WiggleVars {
      /** Number of wiggles/oscillations (default: 10) */
      wiggles?: number;

      /** Type of wiggle animation */
      type?: "easeOut" | "easeInOut" | "anticipate" | "uniform" | "random";

      /** Ease function to control timing/spacing of wiggles */
      timingEase?: string | gsap.EaseFunction;

      /** Ease function to control amplitude/intensity of wiggles */
      amplitudeEase?: string | gsap.EaseFunction;
    }

    /**
     * Configuration function for the "wiggle" ease
     */
    interface WiggleConfigFunction {
      /** Configure wiggle with options object or just number of wiggles */
      (vars: WiggleVars | number): gsap.EaseFunction;
    }

    /**
     * Extended ease function with config method for "wiggle" ease
     */
    interface WiggleEaseFunction extends gsap.EaseFunction {
      config: WiggleConfigFunction;
    }
  }

  // // Augment the GSAP module to override CustomWiggle
  // module "gsap" {
  //   /**
  //    * GSAP CustomWiggle plugin class - properly typed to replace the 'any' type
  //    */
  //   const CustomWiggle: {
  //     /** Version number of the CustomWiggle plugin */
  //     readonly version: string;

  //     /**
  //      * Create a new CustomWiggle instance
  //      * @param id - Optional ID for the ease (can be empty string)
  //      * @param vars - Configuration options for the wiggle
  //      */
  //     new (id?: string, vars?: CustomWiggle.WiggleVars): {
  //       ease: gsap.EaseFunction;
  //     };

  //     /**
  //      * Create a CustomWiggle ease function
  //      * @param id - Optional ID for the ease (can be empty string)
  //      * @param vars - Configuration options for the wiggle
  //      * @returns The generated ease function
  //      */
  //     create(id?: string, vars?: CustomWiggle.WiggleVars): gsap.EaseFunction;

  //     /**
  //      * Register the CustomWiggle plugin with GSAP
  //      * @param core - The GSAP core object
  //      */
  //     register(core: typeof gsap): void;
  //   };

  //   interface ParsedEases {
  //     wiggle: CustomWiggle.WiggleEaseFunction;
  //   }
  // }
}

// Make this file a module
export {};
