import { io, Socket } from "socket.io-client";
import axios from "axios";

const ARENA_SERVER_URL = "wss://dev.reactive.thevorld.com";
const WEBSOCKET_URL = "https://dev.reactive.thevorld.com";
const GAME_API_URL = "https://dev.reactive.thevorld.com/api/v1";
const VORLD_APP_ID = "app_mgs5crer_51c332b3";
const ARENA_GAME_ID = "arcade_mhyvtb3f_0d978769";
type IsoTimestamp = string;

export type SessionStartedEvent = {
  sessionId: string;
  timestamp?: IsoTimestamp;
};

export type CountdownEvent = {
  sessionId: string;
  secondsRemaining: number;
  phase: string;
  timestamp: IsoTimestamp;
};

export type ArenaToggledEvent = {
  sessionId: string;
  arenaActive: boolean;
  timestamp?: IsoTimestamp;
};

export type BoostActivatedEvent = {
  type: "boost_activated";
  sessionId: string;
  actorId: string;
  actorName: string;
  username: string;
  amount: number;
  totalPoints: number;
  timestamp: IsoTimestamp;
};

export type ImmediateItemDropEvent = {
  type: "immediate_item_drop";
  sessionId: string;
  itemId: string;
  itemName: string;
  targetActorId: string;
  targetActorName: string;
  purchaserUsername: string;
  cost: number;
  inputMode: string;
  content: string | null;
  timestamp: IsoTimestamp;
};

export type EventTriggeredEvent = {
  sessionId: string;
  eventId: string;
  name: string;
  targetActorId?: string;
  targetActorName?: string;
  isFinal: boolean;
  triggeredBy: string;
  timestamp: IsoTimestamp;
};

export type SessionEndedReason =
  | "time_expired"
  | "final_event"
  | "manual_stop"
  | "cancelled";

export type SessionEndedEvent = {
  sessionId: string;
  reason: SessionEndedReason;
  winnerActorId?: string;
  winnerActorName?: string;
  finalScores: Record<string, number>;
  timestamp: IsoTimestamp;
};

export type PackageUnlockedEvent = {
  type: "package_unlocked";
  sessionId: string;
  packageId: string;
  packageName: string;
  actorId: string;
  actorName: string;
  unlockedAtPoints: number;
  threshold: number;
  timestamp: IsoTimestamp;
};

export type OverlayVariant = {
  id: string;
  name: string;
};

export type OverlayChangedEvent = {
  sessionId: string;
  variantId: string;
  variant: OverlayVariant;
  changedBy: string;
  isLocked: boolean;
  timestamp: IsoTimestamp;
};

export type CreateSessionRequest = {
  gameConfigId: string;
  streamUrl: string;
  sessionTitle?: string;
};

export interface GamePlayer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameEvent {
  id: string;
  eventName: string;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GamePackage {
  id: string;
  name: string;
  image: string;
  stats: Array<{
    name: string;
    currentValue: number;
    maxValue: number;
    description: string;
  }>;
  players: string[];
  type: string;
  cost: number;
  unlockAtPoints: number;
  metadata: {
    id: string;
    type: string;
    quantity: string;
  };
}

export interface EvaGameDetails {
  _id: string;
  gameId: string;
  vorldAppId: string;
  appName: string;
  gameDeveloperId: string;
  arcadeGameId: string;
  isActive: boolean;
  numberOfCycles: number;
  cycleTime: number;
  waitingTime: number;
  players: GamePlayer[];
  events: GameEvent[];
  packages: GamePackage[];
  createdAt: string;
  updatedAt: string;
}

export interface GameState {
  gameId: string;
  sessionId?: string;
  expiresAt: string;
  status: "pending" | "waiting" | "active" | "completed" | "cancelled";
  websocketUrl: string;
  evaGameDetails: EvaGameDetails;
  arenaActive: boolean;
  countdownStarted: boolean;
  sessionTitle?: string | null;
  streamerUsername?: string | null;
  viewerCount?: number;
  totalCoinsSpent?: number;
}

export interface BoostData {
  playerId: string;
  playerName: string;
  currentCyclePoints: number;
  totalPoints: number;
  arenaCoinsSpent: number;
  newArenaCoinsBalance: number;
}

export interface ItemDrop {
  itemId: string;
  itemName: string;
  targetPlayer: string;
  cost: number;
}

export class ArenaGameService {
  private socket: Socket | null = null;
  private gameState: GameState | null = null;
  private userToken = "";
  private authHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
      "X-Vorld-App-ID": VORLD_APP_ID,
      "Content-Type": "application/json",
    };
  }

  private createSession(data: CreateSessionRequest, token: string) {
    return axios.post(`${GAME_API_URL}/sessions`, data, {
      headers: this.authHeaders(token),
    });
  }

  private getSession(id: string, token: string) {
    return axios.get(`${GAME_API_URL}/sessions/${id}`, {
      headers: this.authHeaders(token),
    });
  }

  private updateSessionStatus(
    sessionId: string,
    status: "completed" | "cancelled" | "aborted",
    token: string,
  ) {
    return axios.patch(
      `${GAME_API_URL}/sessions/${sessionId}/status`,
      { status },
      { headers: this.authHeaders(token) },
    );
  }

  private normalizeBoostPayload(data: BoostActivatedEvent | any) {
    return {
      ...data,
      boostAmount: data?.boostAmount ?? data?.amount ?? 0,
      playerName: data?.playerName ?? data?.actorName ?? "Viewer",
      playerId: data?.playerId ?? data?.actorId,
      boosterUsername: data?.boosterUsername ?? data?.username,
      playerTotalPoints: data?.playerTotalPoints ?? data?.totalPoints,
      currentCyclePoints:
        data?.currentCyclePoints ??
        data?.boostAmount ??
        data?.amount ??
        0,
    };
  }

  private normalizeImmediateDropPayload(data: ImmediateItemDropEvent | any) {
    return {
      ...data,
      targetPlayerName: data?.targetPlayerName ?? data?.targetActorName,
      targetPlayer: data?.targetPlayer ?? data?.targetActorId,
      item: {
        id: data?.itemId,
        name: data?.itemName,
      },
      package: {
        id: data?.itemId,
        name: data?.itemName,
        cost: data?.cost,
      },
    };
  }

  private mapSessionToGameState(session: any): GameState {
    return {
      gameId: session?.id,
      sessionId: session?.id,
      expiresAt: session?.expiresAt ?? "",
      status: session?.status ?? "pending",
      websocketUrl: WEBSOCKET_URL,
      evaGameDetails: session?.evaGameDetails ?? ({} as EvaGameDetails),
      arenaActive: Boolean(session?.arenaActive),
      countdownStarted: Boolean(session?.countdownStartedAt),
      sessionTitle: session?.sessionTitle ?? null,
      streamerUsername: session?.streamerUsername ?? null,
      viewerCount: session?.viewerCount ?? 0,
      totalCoinsSpent: session?.totalCoinsSpent ?? 0,
    };
  }

  // Initialize game with stream URL
  async initializeGame(
    streamUrl: string,
    userToken: string,
  ): Promise<{
    success: boolean;
    data?: GameState;
    error?: string;
    streamerRoleRequired?: boolean;
  }> {
    try {
      this.userToken = userToken;
      console.log("User Token:", this.userToken);
      console.log("Stream URL:", streamUrl);

      const response = await this.createSession(
        {
          gameConfigId: ARENA_GAME_ID,
          streamUrl,
        },
        userToken,
      );
      console.log("response initializeGame", response);

      const session =
        response?.data?.session ??
        response?.data?.data?.session ??
        response?.data?.data ??
        response?.data;
      const sessionId = session?.id;
      let latestSession = session;

      if (sessionId) {
        try {
          const latestResponse = await this.getSession(sessionId, userToken);
          latestSession =
            latestResponse?.data?.session ??
            latestResponse?.data?.data?.session ??
            latestResponse?.data?.data ??
            latestResponse?.data ??
            session;
        } catch (detailError) {
          console.error("Failed to fetch latest session details:", detailError);
        }
      }

      this.gameState = this.mapSessionToGameState(latestSession);

      // Connect to WebSocket
      if (this.gameState?.websocketUrl) {
        await this.connectWebSocket();
      }

      return {
        success: true,
        data: this.gameState ?? undefined,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const body = error?.response?.data;
      const apiError = body?.error;
      const code =
        typeof apiError === "object" && apiError !== null
          ? apiError.code
          : undefined;
      const apiMessage =
        typeof apiError === "object" && apiError !== null
          ? apiError.message
          : undefined;
      const streamerRoleRequired =
        status === 403 &&
        code === "FORBIDDEN" &&
        apiMessage === "Active streamer role required";

      const message =
        apiMessage ||
        (typeof body?.message === "string" ? body.message : undefined) ||
        "Failed to initialize game";

      return {
        success: false,
        error: message,
        streamerRoleRequired,
      };
    }
  }

  private async connectWebSocket(): Promise<boolean> {
    try {
      if (!this.gameState?.sessionId) {
        console.error("Session ID is not set");
        return false;
      }

      // Close existing connection if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(WEBSOCKET_URL, {
        transports: ["websocket"],
        auth: {
          token: this.userToken,
        },
      });

      this.setupEventListeners();

      return new Promise((resolve) => {
        const connectTimeout = setTimeout(() => {
          console.error("❌ WebSocket connection timeout");
          resolve(false);
        }, 30000);

        this.socket?.on("connect", () => {
          clearTimeout(connectTimeout);
          console.log("✅ WebSocket connected! Socket ID:", this.socket?.id);
          console.log("WebSocket connection successful:", true);
          resolve(true);
        });

        this.socket?.on("connect_error", (error) => {
          clearTimeout(connectTimeout);
          console.error("❌ WebSocket connection failed:", error.message);
          console.error("Error details:", error);
          console.log("WebSocket connection successful:", false);
          resolve(false);
        });
      });
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      return false;
    }
  }

  // Set up WebSocket event listeners
  private setupEventListeners(): void {
    if (!this.gameState?.sessionId) {
      console.error("Session ID is not set");
      return;
    }

    this.socket?.on("connect", () => {
      this.socket?.emit("join_session", { sessionId: this.gameState?.sessionId });
    });

    this.socket?.on("connect_error", (error: Error) => {
      console.error("WebSocket connect error:", error.message);
    });

    this.socket?.on("disconnect", (reason: string) => {
      console.log("WebSocket disconnected:", reason);
    });

    // Primary events
    this.socket?.on("session_started", (data: SessionStartedEvent) => {
      this.onArenaCountdownStarted?.(data);
      console.log("Session started:", data.sessionId);
    });

    this.socket?.on("countdown", (data: CountdownEvent) => {
      this.onCountdownUpdate?.(data);
      console.log("Countdown:", data.secondsRemaining, data.phase);
    });

    this.socket?.on("arena_toggled", (data: ArenaToggledEvent) => {
      if (data.arenaActive) {
        this.onArenaBegins?.(data);
      }
      console.log("Arena:", data.arenaActive);
    });

    this.socket?.on("boost_activated", (data: BoostActivatedEvent) => {
      this.onPlayerBoostActivated?.(this.normalizeBoostPayload(data));
      console.log(
        "Boost:",
        data.actorName,
        "+",
        data.amount,
        "points=",
        data.totalPoints,
      );
    });

    this.socket?.on("boost_cycle_update", (data) => {
      console.log("Boost cycle update:", data);
      this.onBoostCycleUpdate?.(data);
    });

    this.socket?.on("boost_cycle_complete", (data) => {
      console.log("Boost cycle complete:", data);
      this.onBoostCycleComplete?.(data);
    });

    this.socket?.on("immediate_item_drop", (data: ImmediateItemDropEvent) => {
      console.log(
        "Drop:",
        data.itemName,
        "->",
        data.targetActorName,
        "by",
        data.purchaserUsername,
      );
      this.onImmediateItemDrop?.(this.normalizeImmediateDropPayload(data));
    });

    this.socket?.on("event_triggered", (data: EventTriggeredEvent) => {
      console.log(
        "Event:",
        data.name,
        "target=",
        data.targetActorName ?? data.targetActorId ?? "global",
      );
      this.onEventTriggered?.(data);
    });

    this.socket?.on("session_ended", (data: SessionEndedEvent) => {
      console.log("Game over:", data.reason, data.winnerActorName, data.finalScores);
      this.onGameCompleted?.(data);
      if (data.reason === "manual_stop" || data.reason === "cancelled") {
        this.onGameStopped?.(data);
      }
    });

    this.socket?.on("package_unlocked", (data: PackageUnlockedEvent) => {
      console.log(
        "Unlocked:",
        data.packageName,
        "for",
        data.actorName,
        "@",
        data.threshold,
      );
      this.onPackageDrop?.({
        ...data,
        packageName: data.packageName,
        playerName: data.actorName,
        playerPackageDrops: [
          {
            playerName: data.actorName,
            playerPoints: data.unlockedAtPoints,
            eligiblePackages: [
              {
                name: data.packageName,
                cost: data.threshold,
              },
            ],
          },
        ],
      });
    });

    this.socket?.on("overlay_changed", (data: OverlayChangedEvent) => {
      console.log("Overlay:", data.variant.name, "locked=", data.isLocked);
    });

    // Legacy aliases
    this.socket?.on("game_start", (data: SessionStartedEvent) => {
      this.onArenaCountdownStarted?.(data);
      console.log("Session started (legacy):", data.sessionId);
    });

    this.socket?.on("game_completed", (data: SessionEndedEvent) => {
      this.onGameCompleted?.(data);
      console.log("Game over (legacy):", data.reason, data.finalScores);
    });

    this.socket?.on("countdown_update", (data: CountdownEvent) => {
      this.onCountdownUpdate?.(data);
      console.log("Countdown (legacy):", data.secondsRemaining, data.phase);
    });

    this.socket?.on("player_boost_activated", (data: BoostActivatedEvent) => {
      this.onPlayerBoostActivated?.(this.normalizeBoostPayload(data));
      console.log("Boost (legacy):", data.actorName, "+", data.amount);
    });

    this.socket?.on("package_drop", (data: ImmediateItemDropEvent) => {
      this.onPackageDrop?.(data);
      console.log("Drop (legacy):", data.itemName, "->", data.targetActorName);
    });

    this.socket?.on("game_stopped", (data) => {
      this.onGameStopped?.(data);
    });

    this.socket?.on("player_joined", (data) => {
      this.onPlayerJoined?.(data);
    });
  }

  // Get game details
  async getGameDetails(
    gameId: string,
  ): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      const response = await this.getSession(gameId, this.userToken);
      const session =
        response?.data?.session ??
        response?.data?.data?.session ??
        response?.data?.data ??
        response?.data;

      return {
        success: true,
        data: this.mapSessionToGameState(session),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get game details",
      };
    }
  }

  // Boost a player
  async boostPlayer(
    gameId: string,
    playerId: string,
    amount: number,
    username: string,
  ): Promise<{ success: boolean; data?: BoostData; error?: string }> {
    try {
      // Validation before making the request
      if (!gameId || !playerId || !amount || !username) {
        console.error("Missing required parameters:", {
          gameId,
          playerId,
          amount,
          username,
        });
        return {
          success: false,
          error: "Missing required parameters",
        };
      }

      if (!this.userToken) {
        console.error("User token is missing");
        return {
          success: false,
          error: "Authentication token is missing",
        };
      }

      console.log("=== Boost Player Request ===");
      console.log("User Token:", this.userToken ? "Present" : "Missing");
      console.log("Arena Game ID:", ARENA_GAME_ID);
      console.log("Vorld App ID:", VORLD_APP_ID);
      console.log("Game API URL:", GAME_API_URL);
      console.log("Game ID:", gameId);
      console.log("Player ID:", playerId);
      console.log("Amount:", amount);
      console.log("Username:", username);
      console.log(
        "Full URL:",
        `${GAME_API_URL}/games/boost/player/${gameId}/${playerId}`,
      );

      const response = await axios.post(
        `${GAME_API_URL}/games/boost/player/${gameId}/${playerId}`,
        {
          amount,
          username,
        },
        {
          headers: {
            Authorization: `Bearer ${this.userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
          // Add timeout to prevent hanging requests
          timeout: 10000,
        },
      );

      console.log("✅ Boost response status:", response.status);
      console.log("✅ Boost response data:", response.data);

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("❌ Boost Player Error - Full details:");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      if (axios.isAxiosError(error)) {
        console.error("Status:", error.response?.status);
        console.error("Response data:", error.response?.data);
        console.error("Request URL:", error.config?.url);
        console.error("Request headers:", error.config?.headers);
        console.error("Request body:", error.config?.data);

        return {
          success: false,
          error:
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message ||
            "Failed to boost player",
        };
      }

      console.error("Non-Axios error:", error);
      return {
        success: false,
        error: error.message || "Failed to boost player",
      };
    }
  }

  // Update stream URL
  async updateStreamUrl(
    gameId: string,
    streamUrl: string,
    oldStreamUrl: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.put(
        `${GAME_API_URL}/games/${gameId}/stream-url`,
        {
          streamUrl,
          oldStreamUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update stream URL",
      };
    }
  }

  // Get items catalog
  async getItemsCatalog(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await axios.get(`${GAME_API_URL}/items/catalog`, {
        headers: {
          Authorization: `Bearer ${this.userToken}`,
          "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
          "X-Vorld-App-ID": VORLD_APP_ID,
        },
      });

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get items catalog",
      };
    }
  }

  // Drop immediate item
  async dropImmediateItem(
    gameId: string,
    itemId: string,
    targetPlayer: string,
  ): Promise<{ success: boolean; data?: ItemDrop; error?: string }> {
    try {
      const response = await axios.post(
        `${GAME_API_URL}/items/drop/${gameId}`,
        {
          itemId,
          targetPlayer,
        },
        {
          headers: {
            Authorization: `Bearer ${this.userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to drop item",
      };
    }
  }

  // Event handlers (to be set by components)
  onArenaCountdownStarted?: (data: any) => void;
  onCountdownUpdate?: (data: any) => void;
  onArenaBegins?: (data: any) => void;
  onPlayerBoostActivated?: (data: any) => void;
  onBoostCycleUpdate?: (data: any) => void;
  onBoostCycleComplete?: (data: any) => void;
  onPackageDrop?: (data: any) => void;
  onImmediateItemDrop?: (data: any) => void;
  onEventTriggered?: (data: any) => void;
  onPlayerJoined?: (data: any) => void;
  onGameCompleted?: (data: any) => void;
  onGameStopped?: (data: any) => void;

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.gameState?.sessionId && this.userToken) {
      this.updateSessionStatus(this.gameState.sessionId, "cancelled", this.userToken).catch(
        (error) => {
          console.error("Failed to update session status during disconnect:", error);
        },
      );
    }
    this.socket?.disconnect();
    this.socket = null;
    this.gameState = null;
  }

  // Get current game state
  getGameState(): GameState | null {
    return this.gameState;
  }
}
