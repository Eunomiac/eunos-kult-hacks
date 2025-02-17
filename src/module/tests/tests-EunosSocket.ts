import type { Quench, QuenchBatchContext } from "@ethaks/fvtt-quench";
import EunosSockets from "../apps/EunosSockets";
import EunosOverlay from "../apps/EunosOverlay";
import EunosAlerts, { AlertType } from "../apps/EunosAlerts";
import { convertTorontoTime, countdownUntil } from "../scripts/utilities";
import { UserTargetRef, MediaLoadStatus } from "../scripts/enums";
interface TestResult {
  fullTitle: string;
  passed: boolean;
  error?: Error;
}

interface BatchReport {
  displayName: string;
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

/**
 * Tests for countdown and pre-session sequence functionality
 */
function registerCountdownTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.gamePhase.components.countdown",
    (context: QuenchBatchContext) => {
      const { describe, it, expect, before, after } = context;

      describe("Countdown and Pre-Session Sequence", function () {
        // Store original nextGameSession value to restore after tests
        let originalNextSession: string;

        before(async function () {
          originalNextSession = getSetting("nextGameSession");
        });

        after(async function () {
          // Restore original nextGameSession value
          await setSetting("nextGameSession", originalNextSession);
        });

        it("should trigger pre-session song at appropriate time", async function () {
          this.timeout(10000); // 10 second timeout

          // Set next session time to 5 minutes from now
          const date = new Date();
          date.setMinutes(date.getMinutes() + 5);
          await setSetting(
            "nextGameSession",
            new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" })).toISOString(),
          );

          // Wait for pre-session song to start
          await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds with 100ms intervals

            const checkSong = () => {
              attempts++;
              const playlist =
                getGame().playlists?.getName("Pre-Session Tracks");
              const topSong = playlist?.sounds.contents[0];

              if (topSong?.playing) {
                resolve();
              } else if (attempts >= maxAttempts) {
                reject(
                  new Error("Timeout waiting for pre-session song to start"),
                );
              } else {
                setTimeout(checkSong, 100);
              }
            };
            checkSong();
          });

          // Verify song is playing
          const playlist = getGame().playlists?.getName("Pre-Session Tracks");
          const topSong = playlist?.sounds.contents[0];
          void expect(topSong?.playing).to.be.true;
        });

        it("should trigger video preload at appropriate time", async function () {
          this.timeout(10000);

          // Set next session time to 6 minutes from now
          const date = new Date();
          date.setMinutes(date.getMinutes() + 6);
          await setSetting(
            "nextGameSession",
            new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" })).toISOString(),
          );

          // Wait for video preload to start
          await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const checkPreload = () => {
              attempts++;
              const video = document.querySelector("video");
              const statusPanel = document.querySelector(".video-status-panel");

              if (video && statusPanel) {
                resolve();
              } else if (attempts >= maxAttempts) {
                reject(new Error("Timeout waiting for video preload to start"));
              } else {
                setTimeout(checkPreload, 100);
              }
            };
            checkPreload();
          });

          // Verify video element exists and status panel is visible
          void expect(document.querySelector("video")).to.exist;
          const statusPanel = document.querySelector(".video-status-panel");
          void expect(statusPanel).to.exist;
          void expect(
            window.getComputedStyle(statusPanel as Element).display !==
              "none" &&
              window.getComputedStyle(statusPanel as Element).visibility !==
                "hidden",
          ).to.be.true;
        });

        it("should hide UI elements at appropriate time", async function () {
          this.timeout(10000);

          // Set next session time to 10 seconds from now
          const date = new Date();
          date.setSeconds(date.getSeconds() + 10);
          await setSetting(
            "nextGameSession",
            new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" })).toISOString(),
          );

          // Wait for UI elements to hide
          await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;

            const checkUI = () => {
              attempts++;
              const apps = document.querySelectorAll(".app");
              const allHidden = Array.from(apps).every(
                (app) =>
                  window.getComputedStyle(app).opacity === "0" ||
                  window.getComputedStyle(app).visibility === "hidden",
              );

              if (allHidden) {
                resolve();
              } else if (attempts >= maxAttempts) {
                reject(new Error("Timeout waiting for UI elements to hide"));
              } else {
                setTimeout(checkUI, 100);
              }
            };
            checkUI();
          });

          // Verify UI elements are hidden
          const apps = document.querySelectorAll(".app");
          void expect(apps.length).to.be.above(0);
          for (const app of apps) {
            const style = window.getComputedStyle(app);
            void expect(
              style.opacity === "0" || style.visibility === "hidden",
              `App element should be hidden: ${app.id || app.className}`,
            ).to.be.true;
          }
        });

        it("should hide countdown at appropriate time", async function () {
          this.timeout(10000);

          // Set next session time to 10 seconds from now
          const date = new Date();
          date.setSeconds(date.getSeconds() + 10);
          await setSetting(
            "nextGameSession",
            new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" })).toISOString(),
          );

          // Wait for countdown to hide
          await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;

            const checkCountdown = () => {
              attempts++;
              const countdown = document.querySelector(
                ".loading-screen-countdown",
              );
              const isHidden =
                !countdown ||
                window.getComputedStyle(countdown).opacity === "0" ||
                window.getComputedStyle(countdown).visibility === "hidden";

              if (isHidden) {
                resolve();
              } else if (attempts >= maxAttempts) {
                reject(new Error("Timeout waiting for countdown to hide"));
              } else {
                setTimeout(checkCountdown, 100);
              }
            };
            checkCountdown();
          });

          // Verify countdown is hidden
          const countdown = document.querySelector(".loading-screen-countdown");
          void expect(
            !countdown ||
              window.getComputedStyle(countdown).opacity === "0" ||
              window.getComputedStyle(countdown).visibility === "hidden",
          ).to.be.true;
        });
      });
    },
    {
      displayName:
        "GamePhase » Countdown: Tests for pre-session countdown and synchronization",
      preSelected: true,
    },
  );
}

/**
 * Tests for date and timezone functionality
 */
function registerDateTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.core.dates",
    (context: QuenchBatchContext) => {
      const { describe, it, expect } = context;

      describe("Date and Timezone Handling", function () {
        it("should correctly convert between UTC and Toronto time", function () {
          // Create a specific date in UTC
          const utcDate = new Date("2024-03-15T19:30:00Z"); // 7:30 PM UTC

          // Convert UTC to Toronto time
          const torontoDate = convertTorontoTime(utcDate, false);

          // Toronto is usually UTC-4 or UTC-5 depending on DST
          // This test accounts for both possibilities
          const hourDiff = utcDate.getUTCHours() - torontoDate.getHours();
          void expect(hourDiff === 4 || hourDiff === 5).to.be.true;
          void expect(torontoDate.getMinutes()).to.equal(30);
        });

        it("should handle DST transitions correctly", function () {
          // Test dates before and after DST transition
          const beforeDST = new Date("2024-03-10T06:59:00Z"); // Just before DST
          const afterDST = new Date("2024-03-10T07:01:00Z");  // Just after DST

          const torontoBefore = convertTorontoTime(beforeDST, false);
          const torontoAfter = convertTorontoTime(afterDST, false);

          // Before DST: UTC-5, After DST: UTC-4
          void expect(beforeDST.getUTCHours() - torontoBefore.getHours()).to.equal(5);
          void expect(afterDST.getUTCHours() - torontoAfter.getHours()).to.equal(4);
        });

        it("should maintain correct time in countdown calculations", function () {
          // Set next session to a known time
          const nextSession = new Date();
          nextSession.setHours(nextSession.getHours() + 2); // 2 hours from now
          void setSetting(
            "nextGameSession",
            nextSession.toISOString()
          );

          // Get countdown
          const countdown = countdownUntil();

          // Should be approximately 2 hours
          void expect(countdown.hours).to.equal(1);
          void expect(countdown.minutes).to.be.lessThan(60);
          void expect(countdown.days).to.equal(0);
        });
      });
    },
    {
      displayName: "Core » Dates: Tests for timezone conversion and date handling",
      preSelected: true,
    },
  );
}

/**
 * Registers all test batches for the EunosSockets class
 * @param quench - The Quench instance to register tests with
 */
export default function registerEunosSocketTests(): void {
  // Register for test reports
  Hooks.once("quenchReports", ({ json }: { json: string }) => {
    const reports = JSON.parse(json) as Record<string, BatchReport>;
    kLog.display("Unformatted Report", reports);
    console.group("Socket Test Results");
    for (const [batchKey, report] of Object.entries(reports)) {
      if (!batchKey.startsWith("eunos.sockets")) continue;

      console.group(report.displayName);
      console.log(
        `Total: ${report.total}, Passed: ${report.passed}, Failed: ${report.failed}`,
      );
      if (report.failed > 0) {
        console.group("Failures");
        report.results
          .filter((r: TestResult) => !r.passed)
          .forEach((result: TestResult) => {
            console.log(`${result.fullTitle}:`);
            console.log(result.error);
          });
        console.groupEnd();
      }
      console.groupEnd();
    }
    console.groupEnd();
  });

  // GM gets all tests
  if (game.user?.isGM) {
    for (const batchFunction of [
      registerSocketInstanceTests,
      registerSocketCallTests,
      registerSocketTargetingTests,
      registerSocketErrorHandlingTests,
      registerMultiUserTests,
      registerCountdownTests,
      registerDateTests,
      ...(import.meta.env.DEV ? [registerDevOnlyTests] : []),
    ]) {
      batchFunction(getQuench());
    }
  } else {
    // Players only get the multi-user tests
    registerMultiUserTests(getQuench());
  }
}

/**
 * Tests for EunosSockets instance management and initialization
 * Verifies the singleton pattern and proper initialization of the socket system
 */
function registerSocketInstanceTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.sockets.instance",
    (context: QuenchBatchContext) => {
      const { describe, it, expect } = context;

      describe("EunosSockets Instance Management", function () {
        it("should create a singleton instance", function () {
          const instance1 = EunosSockets.getInstance();
          const instance2 = EunosSockets.getInstance();
          void expect(instance1).to.equal(instance2);
        });

        it("should initialize the socket system", function () {
          // Test initialization by checking if socketlib was registered
          void expect(window.socketlib.modules.has("eunos-kult-hacks")).to.be
            .true;
        });
      });
    },
    {
      displayName:
        "Sockets » Instance: Tests for socket system initialization and instance management",
    },
  );
}

/**
 * Tests for socket call functionality and message passing
 * Verifies that socket messages are properly sent and received
 */
function registerSocketCallTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.sockets.calls",
    (context: QuenchBatchContext) => {
      const { describe, it, expect, before, after } = context;

      describe("Socket Call Functionality", function () {
        // Clean up any video elements before and after each test
        before(function () {
          document.querySelectorAll("video").forEach((el) => {
            el.remove();
          });
        });

        after(function () {
          document.querySelectorAll("video").forEach((el) => {
            el.remove();
          });
        });

        it("should call reportPreloadStatus", async function () {
          const instance = EunosSockets.getInstance();
          const userId = game.user?.id ?? "";
          const promise = instance.call(
            "reportPreloadStatus",
            UserTargetRef.gm,
            {
              userId,
              status: MediaLoadStatus.Ready,
            },
          );
          void expect(promise).to.be.instanceOf(Promise);
          await expect(promise).to.be.fulfilled;
        });

        it("should call startVideoPlayback", async function () {
          const instance = EunosSockets.getInstance();
          const promise = instance.call(
            "startVideoPlayback",
            UserTargetRef.all,
          );
          void expect(promise).to.be.instanceOf(Promise);
          await expect(promise).to.be.fulfilled;
          // Verify only one video element exists
          void expect(document.querySelectorAll("video")).to.have.lengthOf(1);
        });
      });
    },
    {
      displayName:
        "Sockets » Calls: Tests for basic socket communication and message passing",
    },
  );
}

/**
 * Tests for user targeting functionality
 * Verifies that messages are sent to the correct users based on targeting rules
 */
function registerSocketTargetingTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.core.userTargeting",
    (context: QuenchBatchContext) => {
      const { describe, it, expect } = context;

      describe("User Targeting", function () {
        it("should get all users for UserTargetRef.all", function () {
          const instance = EunosSockets.getInstance();
          const users = instance.getUsersFromTarget(UserTargetRef.all);
          void expect(users).to.have.length.above(0);
          void expect(users).to.deep.equal(getUsers().filter((u) => u.active));
        });

        it("should get only GM users for UserTargetRef.gm", function () {
          const instance = EunosSockets.getInstance();
          const users = instance.getUsersFromTarget(UserTargetRef.gm);
          void expect(users.every((u) => u.isGM)).to.be.true;
        });

        it("should get only current user for UserTargetRef.self", function () {
          const instance = EunosSockets.getInstance();
          const users = instance.getUsersFromTarget(UserTargetRef.self);
          void expect(users).to.have.lengthOf(1);
          void expect(users[0]).to.equal(game.user);
        });

        it("should get specific user by ID", function () {
          const instance = EunosSockets.getInstance();
          const userId = game.user?.id;
          if (userId) {
            const users = instance.getUsersFromTarget(userId);
            void expect(users).to.have.lengthOf(1);
            void expect(users[0]!.id).to.equal(userId);
          }
        });
      });
    },
    {
      displayName:
        "Core » User Targeting: Tests for user targeting and message recipient selection",
    },
  );
}

/**
 * Tests for socket error handling
 * Verifies proper handling of various error conditions
 */
function registerSocketErrorHandlingTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.sockets.errors",
    (context: QuenchBatchContext) => {
      const { describe, it, expect } = context;

      describe("Socket Error Handling", function () {
        it("should handle invalid target", async function () {
          const instance = EunosSockets.getInstance();
          const invalidTarget = "invalidUserId" as UserTargetRef;
          let error: unknown;
          try {
            const users = instance.getUsersFromTarget(invalidTarget);
            void expect(users).to.have.lengthOf(0);
          } catch (err) {
            error = err;
          }
          void expect(error).to.exist;
          void expect(error).to.be.instanceOf(Error);
          void expect((error as Error).message).to.include("Invalid target");
        });

        it("should validate reportPreloadStatus data type", async function () {
          const instance = EunosSockets.getInstance();
          let error: unknown;
          try {
            // reportPreloadStatus expects a userId string
            await instance.call("reportPreloadStatus", UserTargetRef.all, {
              someObject: true,
            } as never);
          } catch (err) {
            error = err;
          }
          void expect(error).to.exist;
          void expect(error).to.be.instanceOf(Error);
          void expect((error as Error).message).to.include("userId");
        });

        it("should require data for events that need it", async function () {
          const instance = EunosSockets.getInstance();
          let error: unknown;
          try {
            // reportPreloadStatus requires a userId
            await instance.call("reportPreloadStatus", UserTargetRef.all);
          } catch (err) {
            error = err;
          }
          void expect(error).to.exist;
          void expect(error).to.be.instanceOf(Error);
          void expect((error as Error).message).to.include("requires data");
        });

        it("should reject data for events that don't accept it", async function () {
          const instance = EunosSockets.getInstance();
          let error: unknown;
          try {
            // startVideoPlayback doesn't accept any data
            await instance.call(
              "startVideoPlayback",
              UserTargetRef.all,
              "some data" as never,
            );
          } catch (err) {
            error = err;
          }
          void expect(error).to.exist;
          void expect(error).to.be.instanceOf(Error);
          void expect((error as Error).message).to.include(
            "does not accept any data",
          );
        });
      });
    },
    {
      displayName: "Sockets » Errors: Tests for error handling and recovery",
      preSelected: true, // Ensure these tests run by default
    },
  );
}

/**
 * Tests for multi-user socket interactions
 * Requires both GM and player clients to be connected
 */
function registerMultiUserTests(quench: Quench): void {
  // Check to ensure at least two users are connected, and one of them is a GM
  const users = getUsers().filter((u) => u.active);
  if (users.length < 2 || !users.some((u) => u.isGM)) {
    return;
  }

  quench.registerBatch(
    "eunos.sockets.multiuser",
    (context: QuenchBatchContext) => {
      const { describe, it, expect, before, after } = context;

      describe("Multi-User Socket Interactions", function () {
        before(function () {
          // Clean up any existing video elements
          document.querySelectorAll("video").forEach((el) => {
            el.remove();
          });
        });

        after(function () {
          // Clean up video elements
          document.querySelectorAll("video").forEach((el) => {
            el.remove();
          });
        });

        // Tests that run only on the GM client
        if (game.user?.isGM) {
          describe("GM Client Tests", function () {
            it("should show video status panel when receiving player ready status", async function () {
              this.timeout(10000); // Allow up to 10 seconds for players to report ready
              const overlay = EunosOverlay.instance;

              // Wait for player to report ready
              await new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 100; // 10 seconds with 100ms intervals

                const checkStatus = () => {
                  attempts++;
                  // Get all connected users (including GM)
                  const allUsers = getUsers().filter((u) => u.active);

                  if (allUsers.length === 0) {
                    reject(new Error("No connected users found"));
                    return;
                  }

                  const readyUsers = allUsers.filter(
                    (u) =>
                      u.id &&
                      overlay.videoLoadStatus.get(u.id) ===
                        MediaLoadStatus.Ready,
                  );

                  // Log progress
                  console.log(
                    `Waiting for users to report ready: ${readyUsers.length}/${allUsers.length} ready`,
                  );

                  if (readyUsers.length === allUsers.length) {
                    resolve();
                  } else if (attempts >= maxAttempts) {
                    reject(
                      new Error(
                        `Timeout waiting for users to report ready. ${readyUsers.length}/${allUsers.length} users ready`,
                      ),
                    );
                  } else {
                    setTimeout(checkStatus, 100);
                  }
                };
                checkStatus();
              });

              // Give the UI a moment to update
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Debug logging
              const activeUsers = getUsers().filter((u) => u.active);
              console.log(
                "Active users:",
                activeUsers.map((u) => `${u.name} (${u.id})`),
              );

              // Log the entire video status panel HTML for debugging
              const panel = document.querySelector(".video-status-panel");
              console.log("Video status panel HTML:", panel?.outerHTML);

              // Try different selectors
              const readyStatuses = document.querySelectorAll(
                ".video-status-panel .user-status.ready",
              );
              const userStatuses = document.querySelectorAll(
                ".video-status-panel [data-user-id]",
              );
              const allStatuses = document.querySelectorAll(
                ".video-status-panel .user-status",
              );

              console.log("Status elements found:", {
                ".video-status-panel .user-status.ready": readyStatuses.length,
                ".video-status-panel [data-user-id]": userStatuses.length,
                ".video-status-panel .user-status": allStatuses.length,
              });

              // Log each status element's classes and attributes
              allStatuses.forEach((el) => {
                console.log("Status element:", {
                  classes: el.className,
                  userId: el.getAttribute("data-user-id"),
                  name: el.querySelector(".user-name")?.textContent?.trim(),
                  indicator: el
                    .querySelector(".status-indicator")
                    ?.textContent?.trim(),
                });
              });

              // Verify the status panel shows all users ready
              void expect(
                allStatuses.length,
                "Number of status elements",
              ).to.equal(activeUsers.length);
              void expect(
                readyStatuses.length,
                "Number of ready status elements",
              ).to.equal(activeUsers.length);

              // Verify each active user has a ready status
              for (const user of activeUsers) {
                const statusElement = document.querySelector(
                  `.video-status-panel .user-status.ready[data-user-id="${user.id}"]`,
                );
                void expect(statusElement, `Ready status for user ${user.name}`)
                  .to.exist;
              }
            });

            it("should trigger video playback when GM clicks Play Video button", async function () {
              this.timeout(30000); // Allow up to 30 seconds for manual interaction
              const instance = EunosSockets.getInstance();
              const userId = game.user?.id;
              if (!userId) throw new Error("No user ID found");

              // Report GM ready first
              await instance.call(
                "reportPreloadStatus",
                UserTargetRef.gm,
                {
                  userId,
                  status: MediaLoadStatus.Ready,
                },
              );

              // Create an interactive prompt
              await Dialog.prompt({
                title: "Video Playback Test",
                content: `
                  <h2>Manual Test Step</h2>
                  <p>All users have reported ready status.</p>
                  <p>1. Click the 'Play Video' button in the GM controls panel</p>
                  <p>2. Wait for the video to start playing</p>
                  <p>3. Click 'Continue Test' below to verify playback</p>
                `,
                label: "Continue Test",
                callback: () => true,
                rejectClose: false,
              });

              // Wait for video element to be created and start playing
              await new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 100; // 10 seconds with 100ms intervals

                const checkVideo = () => {
                  attempts++;
                  const video = document.querySelector("video");
                  if (video && !video.paused) {
                    resolve();
                  } else if (attempts >= maxAttempts) {
                    reject(
                      new Error("Timeout waiting for video to start playing"),
                    );
                  } else {
                    setTimeout(checkVideo, 100);
                  }
                };
                checkVideo();
              });

              // Verify video starts playing on GM client
              const video = document.querySelector("video");
              void expect(video).to.exist;
              void expect(video?.paused).to.be.false;
            });

            it("should cleanup video and status panel after playback", async function () {
              // Wait for video to be available and get its duration
              const videoDuration = await new Promise<number>(
                (resolve, reject) => {
                  let attempts = 0;
                  const maxAttempts = 100; // 10 seconds to find video element

                  const checkVideo = () => {
                    attempts++;
                    const video = document.querySelector("video");
                    if (video && !isNaN(video.duration)) {
                      resolve(video.duration);
                    } else if (attempts >= maxAttempts) {
                      reject(new Error("Timeout waiting for video to load"));
                    } else {
                      setTimeout(checkVideo, 100);
                    }
                  };
                  checkVideo();
                },
              );

              // Set timeout to video duration plus 5 seconds for fade effects and cleanup
              this.timeout((videoDuration + 5) * 1000);
              console.log(
                `Video duration: ${videoDuration}s, total test timeout: ${videoDuration + 5}s`,
              );

              // Wait for video to finish playing
              await new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = Math.ceil((videoDuration + 3) * 10); // Check every 100ms

                const checkVideoEnded = () => {
                  attempts++;
                  const video = document.querySelector("video");

                  // If video is gone, it's been cleaned up
                  if (!video) {
                    resolve();
                    return;
                  }

                  // If video has ended, wait for cleanup
                  if (video.ended) {
                    setTimeout(checkVideoEnded, 100);
                    return;
                  }

                  if (attempts >= maxAttempts) {
                    reject(
                      new Error(
                        `Timeout waiting for video to end and cleanup after ${videoDuration + 3} seconds`,
                      ),
                    );
                  } else {
                    setTimeout(checkVideoEnded, 100);
                  }
                };
                checkVideoEnded();
              });

              // Verify cleanup
              void expect(document.querySelector("video")).to.not.exist;

              // Check that the video status panel is either not in the DOM or hidden
              const statusPanel = document.querySelector(".video-status-panel");
              void expect(
                !statusPanel ||
                  window.getComputedStyle(statusPanel).display === "none" ||
                  window.getComputedStyle(statusPanel).visibility === "hidden",
              ).to.be.true;

              void expect(document.body.classList.contains("show-video-status"))
                .to.be.false;
            });
          });
        }

        // Tests that run only on player clients
        if (!game.user?.isGM) {
          describe("Player Client Tests", function () {
            it("should report ready status to GM", async function () {
              const instance = EunosSockets.getInstance();
              const userId = game.user?.id;
              if (!userId) throw new Error("No user ID found");

              // Report ready status
              await instance.call(
                "reportPreloadStatus",
                UserTargetRef.gm,
                {
                  userId,
                  status: MediaLoadStatus.Ready,
                },
              );

              // Wait a bit to ensure the GM receives the status
              await new Promise((resolve) => setTimeout(resolve, 100));
            });

            it("should start playing video when GM initiates", async function () {
              this.timeout(30000); // Allow up to 30 seconds for GM interaction

              // Wait for video element to be created and start playing
              await new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 200; // 20 seconds with 100ms intervals

                const checkVideo = () => {
                  attempts++;
                  const video = document.querySelector("video");
                  if (video && !video.paused) {
                    resolve();
                  } else if (attempts >= maxAttempts) {
                    reject(
                      new Error("Timeout waiting for video to start playing"),
                    );
                  } else {
                    setTimeout(checkVideo, 100);
                  }
                };
                checkVideo();
              });

              // Verify video exists and is playing
              const video = document.querySelector("video");
              void expect(video).to.exist;
              void expect(video?.paused).to.be.false;
            });
          });
        }
      });
    },
    {
      displayName:
        "Sockets » Multi-User: Tests requiring multiple connected users",
      preSelected: true,
    },
  );
}

/**
 * Development-only tests for additional socket functionality
 * These tests may be more intensive or test edge cases
 */
function registerDevOnlyTests(quench: Quench): void {
  quench.registerBatch(
    "eunos.sockets.stress",
    (context: QuenchBatchContext) => {
      const { describe, it, expect } = context;

      describe("Socket Development Tests", function () {
        it("should handle rapid socket calls", async function () {
          const instance = EunosSockets.getInstance();
          const testAlerts: Array<Partial<EunosAlerts.Data>> = [
            {
              type: AlertType.simple,
              target: UserTargetRef.self,
              header: "Test Alert 1",
              body: "Testing rapid socket calls",
            },
            {
              type: AlertType.simple,
              target: UserTargetRef.self,
              header: "Test Alert 2",
              body: "Testing concurrent user targeting",
            },
            {
              type: AlertType.simple,
              target: UserTargetRef.self,
              header: "Test Alert 3",
              body: "Testing large data payloads",
            },
          ];

          const promises = testAlerts.map((alertData) =>
            instance.call("Alert", UserTargetRef.self, alertData),
          );

          await Promise.all(promises);
          void expect(true).to.be.true; // If we get here, all calls succeeded
        });

        it("should handle concurrent user targeting", async function () {
          const instance = EunosSockets.getInstance();
          const targets = [
            UserTargetRef.all,
            UserTargetRef.gm,
            UserTargetRef.self,
            game.user?.id ?? "",
          ];

          const testAlert: Partial<EunosAlerts.Data> = {
            type: AlertType.simple,
            target: UserTargetRef.self,
            header: "Test Alert",
            body: "Testing concurrent targeting",
          };

          const promises = targets.map((target) =>
            instance.call("Alert", target, testAlert),
          );

          await Promise.all(promises);
          void expect(true).to.be.true; // If we get here, all calls succeeded
        });

        // Add more intensive tests that shouldn't run in production
        it("should handle large data payloads", async function () {
          const instance = EunosSockets.getInstance();
          const largeContent = "Test content ".repeat(100); // Create a larger string

          const largeAlert: Partial<EunosAlerts.Data> = {
            type: AlertType.simple,
            target: UserTargetRef.self,
            header: "Large Data Test",
            body: largeContent,
            skipQueue: true, // Skip the queue for this large test alert
          };

          await instance.call("Alert", UserTargetRef.self, largeAlert);
          void expect(true).to.be.true; // If we get here, the call succeeded
        });
      });
    },
    {
      displayName:
        "Sockets » Stress Tests: Development-only tests for edge cases and performance",
    },
  );
}
