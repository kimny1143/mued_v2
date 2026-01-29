"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

interface HooAnimatedProps {
  width?: number;
  height?: number;
  className?: string;
  onBounce?: (phrase: string) => void;
  getNextPhrase?: () => string;
  currentPhrase?: string;
  isMobile?: boolean;
  /** Disable all animations (glance, bounce, tape reel, etc.) - static logo mode */
  disableAnimations?: boolean;
  /** MUEDear mode: ear-focused animations instead of eye glance */
  muedearMode?: boolean;
}

const COLOR = "#FFFFFF";

/**
 * Animated Hoo mascot - Owl + Tape Reel hybrid
 * - Reels rotate (left: clockwise, right: counter-clockwise)
 * - Bounce animation (2 quick bounces every 15-20 seconds)
 */
// MUEDnote phrases
const REST_PHRASES = ["そろそろ休憩しない？", "time for a break?"];
const SURPRISE_PHRASES = ["そんなアプローチするんだ", "interesting approach"];
const NICE_IDEA_PHRASES = ["そのアイデアいいね", "nice idea"];

// MUEDear phrases - ear-focused
const MUEDEAR_PHRASES = [
  { ja: "耳トレ、やってみる？", en: "Wanna try some ear training?", animation: "spin" },
  { ja: "ほほう、いい耳してるね", en: "Ho-hoo, nice ears!", animation: "bounce" },
  { ja: "実はこれ、耳じゃなくて、\n羽角 うかくなんだよね。", en: "Actually, these aren't ears—\nthey're feather tufts.", animation: "tilt" },
];

export function HooAnimated({ width = 280, height = 280, className, onBounce, getNextPhrase, currentPhrase, isMobile = false, disableAnimations = false, muedearMode = false }: HooAnimatedProps) {
  const controls = useAnimationControls();
  const eyeControls = useAnimationControls();
  const earControls = useAnimationControls();
  const earLeftControls = useAnimationControls();
  const earRightControls = useAnimationControls();
  const animateMotionRef = useRef<SVGAnimateMotionElement>(null);
  const isRestAnimating = useRef(false);
  const isMounted = useRef(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  const muedearPhraseIndex = useRef(0);

  const triggerEyeGlance = useCallback(async () => {
    // Glance direction: left on desktop (DAW is on left), right on mobile (background is behind/right)
    const direction = isMobile ? 4 : -4;
    // Quick move, hold 1s, back, quick move again, hold 1s, back
    await eyeControls.start({
      x: [0, direction, direction, 0, 0, direction, direction, 0],
      transition: {
        duration: 3,
        times: [0, 0.05, 0.4, 0.45, 0.5, 0.55, 0.9, 1],
        ease: "easeInOut",
      },
    });
  }, [eyeControls, isMobile]);

  // Surprise animation: enlarge pupils for 1 second
  const triggerSurprise = useCallback(async () => {
    await eyeControls.start({
      scale: [1, 1.8, 1.8, 1],
      transition: {
        duration: 1.5,
        times: [0, 0.2, 0.8, 1],
        ease: "easeOut",
      },
    });
  }, [eyeControls]);

  // Nice idea animation: spin ears twice quickly
  const triggerEarSpin = useCallback(async () => {
    await earControls.start({
      rotate: [0, 360, 720],
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      },
    });
    // Reset rotation
    earControls.set({ rotate: 0 });
  }, [earControls]);

  // MUEDear: Ears bounce (instead of whole body)
  const triggerEarBounce = useCallback(async () => {
    await Promise.all([
      earLeftControls.start({
        y: [0, -8, 0, -8, 0],
        transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeOut" },
      }),
      earRightControls.start({
        y: [0, -8, 0, -8, 0],
        transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeOut" },
      }),
    ]);
  }, [earLeftControls, earRightControls]);

  // MUEDear: Ears tilt outward (feather tufts joke)
  const triggerEarTilt = useCallback(async () => {
    await Promise.all([
      earLeftControls.start({
        rotate: [0, -20, -20, 0],
        transition: { duration: 1.2, times: [0, 0.3, 0.7, 1], ease: "easeInOut" },
      }),
      earRightControls.start({
        rotate: [0, 20, 20, 0],
        transition: { duration: 1.2, times: [0, 0.3, 0.7, 1], ease: "easeInOut" },
      }),
    ]);
  }, [earLeftControls, earRightControls]);

  // Rest animation: stop tape → close eyes → wait 5s → open eyes → resume
  const triggerRestAnimation = useCallback(async () => {
    if (isRestAnimating.current) return;
    isRestAnimating.current = true;

    const animateMotion = animateMotionRef.current;
    const svgElement = animateMotion?.ownerSVGElement;

    // 1. Pause tape animation
    if (svgElement) {
      svgElement.pauseAnimations();
    }

    // 2. Wait 2 seconds, then close eyes
    await new Promise(resolve => setTimeout(resolve, 2000));
    setEyesClosed(true);

    // 3. Wait 6 more seconds (bubble disappears at 6s, then +2s = 8s total from phrase)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // 4. Open eyes and resume
    setEyesClosed(false);

    if (svgElement) {
      svgElement.unpauseAnimations();
    }

    isRestAnimating.current = false;
  }, []);

  const triggerSequence = useCallback(async () => {
    if (!isMounted.current) return;

    // 0. Get next phrase first to determine animation
    const nextPhrase = getNextPhrase?.() || "";
    const isSurprise = SURPRISE_PHRASES.some(p => nextPhrase.includes(p));
    const isNiceIdea = NICE_IDEA_PHRASES.some(p => nextPhrase.includes(p));

    // 1. Eye glance first (3s animation) - looking at DAW
    await triggerEyeGlance();

    // 2. Phrase-specific pre-animations (after seeing DAW)
    if (isSurprise) {
      await triggerSurprise();
    } else if (isNiceIdea) {
      await triggerEarSpin();
    }

    // 3. Wait a moment, then bounce
    setTimeout(async () => {
      if (!isMounted.current) return;
      // Call onBounce right after 2nd bounce peak (0.35s)
      setTimeout(() => onBounce?.(nextPhrase), 350);
      await controls.start({
        y: [0, -5, 0, -5, 0],
        transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeOut" },
      });
    }, 500);
  }, [controls, onBounce, getNextPhrase, triggerEyeGlance, triggerSurprise, triggerEarSpin]);

  // MUEDear sequence: ear-focused animations
  const triggerMuedearSequence = useCallback(async () => {
    if (!isMounted.current) return;

    // Get current phrase (cycle through)
    const phraseData = MUEDEAR_PHRASES[muedearPhraseIndex.current];
    muedearPhraseIndex.current = (muedearPhraseIndex.current + 1) % MUEDEAR_PHRASES.length;

    // Determine phrase based on locale (check if Japanese characters exist in document)
    const isJapanese = typeof document !== "undefined" && document.documentElement.lang === "ja";
    const phrase = isJapanese ? phraseData.ja : phraseData.en;

    // Trigger ear animation based on phrase type
    if (phraseData.animation === "spin") {
      await triggerEarSpin();
    } else if (phraseData.animation === "bounce") {
      await triggerEarBounce();
    } else if (phraseData.animation === "tilt") {
      await triggerEarTilt();
    }

    // Show phrase after animation
    onBounce?.(phrase);
  }, [triggerEarSpin, triggerEarBounce, triggerEarTilt, onBounce]);

  // Track mounted state for animation safety
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip automatic animations if disabled
    if (disableAnimations) return;

    let timeoutId: NodeJS.Timeout;

    const sequence = muedearMode ? triggerMuedearSequence : triggerSequence;

    const scheduleNextSequence = () => {
      const delay = 15000 + Math.random() * 5000; // 15-20 seconds
      timeoutId = setTimeout(async () => {
        if (isMounted.current) {
          await sequence();
          scheduleNextSequence();
        }
      }, delay);
    };

    // Initial sequence after a short delay
    const initialTimeout = setTimeout(() => {
      if (isMounted.current) {
        sequence();
        scheduleNextSequence();
      }
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [triggerSequence, triggerMuedearSequence, disableAnimations, muedearMode]);

  // Trigger rest animation when phrase contains rest-related text
  useEffect(() => {
    if (currentPhrase && REST_PHRASES.some(phrase => currentPhrase.includes(phrase))) {
      triggerRestAnimation();
    }
  }, [currentPhrase, triggerRestAnimation]);

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox="150 50 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={controls}
    >
      {/* Ears - each rotates/bounces around its own center */}
      <g id="ears">
        <motion.path
          id="ear-left"
          d="M169.419 84.4499L154.708 109.93H184.129L169.419 84.4499Z"
          fill={COLOR}
          animate={muedearMode ? earLeftControls : earControls}
          style={{ transformOrigin: "169.4px 101.4px" }}
        />
        <motion.path
          id="ear-right"
          d="M353.509 84.4499L338.798 109.93H368.22L353.509 84.4499Z"
          fill={COLOR}
          animate={muedearMode ? earRightControls : earControls}
          style={{ transformOrigin: "353.5px 101.4px" }}
        />
      </g>

      {/* Left Reel (Eye) - Static circles */}
      <circle
        id="reel-left-outer"
        cx="204.5"
        cy="168.5"
        r="47"
        stroke={COLOR}
        strokeWidth="5"
        fill="none"
      />
      <circle
        id="reel-left-inner"
        cx="204.5"
        cy="169.5"
        r="22"
        stroke={COLOR}
        strokeWidth="5"
        fill="none"
      />
      {/* Left eye - open (circle) or closed (downward arc) */}
      {eyesClosed ? (
        <motion.path
          id="eye-left-closed"
          d="M196 166 Q204.5 174 213 166"
          stroke={COLOR}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      ) : (
        <motion.circle
          id="eye-left"
          cx="204.496"
          cy="168.501"
          r="5.919"
          fill={COLOR}
          animate={eyeControls}
          style={{ transformOrigin: "204.496px 168.501px" }}
        />
      )}

      {/* Right Reel (Eye) - Static circles */}
      <circle
        id="reel-right-outer"
        cx="317.5"
        cy="168.5"
        r="47"
        stroke={COLOR}
        strokeWidth="5"
        fill="none"
      />
      <circle
        id="reel-right-inner"
        cx="317.5"
        cy="169.5"
        r="22"
        stroke={COLOR}
        strokeWidth="5"
        fill="none"
      />
      {/* Right eye - open (circle) or closed (downward arc) */}
      {eyesClosed ? (
        <motion.path
          id="eye-right-closed"
          d="M309 166 Q317.5 174 326 166"
          stroke={COLOR}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      ) : (
        <motion.circle
          id="eye-right"
          cx="317.181"
          cy="168.502"
          r="5.919"
          fill={COLOR}
          animate={eyeControls}
          style={{ transformOrigin: "317.181px 168.502px" }}
        />
      )}

      {/* Normal forward animation - BEHIND tape (白塗り黒枠) */}
      {!disableAnimations && (
        <circle r="5" fill={COLOR} stroke="#000000" strokeWidth="2">
          <animateMotion
            ref={animateMotionRef}
            dur="16s"
            repeatCount="indefinite"
            path="
              M 204.5,215.5
              A 47,47 0 0,1 204.5,121.5
              L 317.5,121.5
              A 47,47 0 1,1 289.2,206.0
              L 217.7,151.9
              A 22,22 0 1,0 204.5,191.5
              L 317.5,191.5
              A 22,22 0 1,0 304.3,152.0
              L 232.8,206.0
              A 47,47 0 0,1 204.5,215.5
              Z
            "
          />
        </circle>
      )}

      {/* Tape (connecting reels) */}
      <path
        id="tape"
        d="M317.692 212.121C308.81 212.121 300.546 209.448 293.646 204.871L289.501 201.749C286.674 199.348 284.158 196.595 282.018 193.556H316.469C316.83 193.571 317.186 193.611 317.553 193.611C331.29 193.611 342.428 182.473 342.428 168.735C342.428 154.997 331.29 143.861 317.553 143.861C312.213 143.861 307.277 145.559 303.224 148.423L303.165 148.345L274.118 170.316C274.094 169.715 274.073 169.111 274.073 168.503C274.073 144.451 293.64 124.883 317.692 124.883C341.744 124.883 361.312 144.451 361.312 168.503C361.312 192.553 341.744 212.121 317.692 212.121ZM300.14 168.735C300.14 159.119 307.936 151.323 317.553 151.323C327.169 151.323 334.965 159.119 334.965 168.735C334.965 178.352 327.169 186.148 317.553 186.148C307.936 186.148 300.14 178.352 300.14 168.735ZM275.037 177.613L293.154 163.909C292.848 165.472 292.677 167.084 292.677 168.735C292.677 176.063 295.865 182.629 300.906 187.181H278.284C276.848 184.167 275.752 180.96 275.037 177.613ZM270.156 187.181L266.262 184.251L269.508 181.796C270.016 183.636 270.626 185.433 271.333 187.181H270.156ZM254.046 175.052C254.329 172.907 254.489 170.724 254.489 168.503C254.489 149.787 244.145 133.451 228.881 124.883H293.306C278.042 133.451 267.698 149.787 267.698 168.503C267.698 170.656 267.852 172.773 268.117 174.856L260.968 180.264L254.046 175.052ZM251.822 187.181H250.856C251.541 185.487 252.134 183.747 252.633 181.965L255.682 184.263L251.822 187.181ZM248.064 170.547L220.24 149.596C215.93 146.016 210.396 143.861 204.357 143.861C190.618 143.861 179.481 154.997 179.481 168.735C179.481 182.473 190.618 193.611 204.357 193.611C204.94 193.611 205.512 193.563 206.085 193.523V193.556H240.17C238.244 196.289 236.017 198.795 233.529 201.019L233.176 201.287L233.193 201.311C225.517 208.033 215.477 212.121 204.496 212.121C180.444 212.121 160.877 192.553 160.877 168.503C160.877 144.451 180.444 124.883 204.496 124.883C228.548 124.883 248.116 144.451 248.116 168.503C248.116 169.188 248.096 169.869 248.064 170.547ZM204.357 186.148C194.74 186.148 186.944 178.352 186.944 168.735C186.944 159.119 194.74 151.323 204.357 151.323C213.973 151.323 221.769 159.119 221.769 168.735C221.769 178.352 213.973 186.148 204.357 186.148ZM243.905 187.181H221.002C226.044 182.629 229.232 176.063 229.232 168.735C229.232 167.113 229.064 165.532 228.768 163.996L247.106 177.805C246.392 181.083 245.312 184.224 243.905 187.181ZM317.692 118.509H204.496C176.929 118.509 154.502 140.936 154.502 168.503C154.502 196.068 176.929 218.495 204.496 218.495C217.13 218.495 228.677 213.775 237.488 206.016L253.961 193.556H268.024L285.545 206.748C286.956 207.936 288.43 209.051 289.969 210.08L290.609 210.561L290.645 210.513C298.448 215.555 307.73 218.495 317.692 218.495C345.258 218.495 367.685 196.068 367.685 168.503C367.685 140.936 345.258 118.509 317.692 118.509Z"
        fill={COLOR}
      />

          </motion.svg>
  );
}
