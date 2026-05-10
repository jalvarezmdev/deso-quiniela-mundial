import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
//#region src/lib/game.ts
function resultSign(homeGoals, awayGoals) {
	if (homeGoals > awayGoals) return 1;
	if (homeGoals < awayGoals) return -1;
	return 0;
}
function isKnockoutPhase(phase) {
	return phase !== "groups";
}
function computeMatchPoints(outcome, prediction) {
	if (outcome.homeGoals === prediction.homeGoals && outcome.awayGoals === prediction.awayGoals) return 3;
	if (isKnockoutPhase(outcome.phase)) {
		if (outcome.qualifiedTeamId && prediction.predictedQualifiedTeamId === outcome.qualifiedTeamId) return 1;
		return 0;
	}
	return resultSign(outcome.homeGoals, outcome.awayGoals) === resultSign(prediction.homeGoals, prediction.awayGoals) ? 1 : 0;
}
//#endregion
//#region src/lib/time.ts
var VEN_TZ = "America/Caracas";
function toVenDateTimeLabel(isoDate) {
	return new Intl.DateTimeFormat("es-VE", {
		timeZone: VEN_TZ,
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	}).format(new Date(isoDate));
}
function toVenDateTimeInputValue(isoDate) {
	const date = new Date(isoDate);
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: VEN_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}).formatToParts(date).reduce((acc, part) => {
		if (part.type !== "literal") acc[part.type] = part.value;
		return acc;
	}, {});
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function fromVenDateTimeInput(input) {
	return new Date(input).toISOString();
}
function nowIso() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
//#endregion
//#region src/lib/teams.ts
var TEAMS = [
	{
		id: "arg",
		name: "Argentina",
		flag: "🇦🇷"
	},
	{
		id: "bra",
		name: "Brasil",
		flag: "🇧🇷"
	},
	{
		id: "uru",
		name: "Uruguay",
		flag: "🇺🇾"
	},
	{
		id: "col",
		name: "Colombia",
		flag: "🇨🇴"
	},
	{
		id: "ven",
		name: "Venezuela",
		flag: "🇻🇪"
	},
	{
		id: "ecu",
		name: "Ecuador",
		flag: "🇪🇨"
	},
	{
		id: "usa",
		name: "Estados Unidos",
		flag: "🇺🇸"
	},
	{
		id: "mex",
		name: "Mexico",
		flag: "🇲🇽"
	},
	{
		id: "can",
		name: "Canada",
		flag: "🇨🇦"
	},
	{
		id: "esp",
		name: "España",
		flag: "🇪🇸"
	},
	{
		id: "fra",
		name: "Francia",
		flag: "🇫🇷"
	},
	{
		id: "eng",
		name: "Inglaterra",
		flag: "🏴"
	},
	{
		id: "por",
		name: "Portugal",
		flag: "🇵🇹"
	},
	{
		id: "ger",
		name: "Alemania",
		flag: "🇩🇪"
	},
	{
		id: "ita",
		name: "Italia",
		flag: "🇮🇹"
	},
	{
		id: "ned",
		name: "Paises Bajos",
		flag: "🇳🇱"
	},
	{
		id: "bel",
		name: "Belgica",
		flag: "🇧🇪"
	},
	{
		id: "cro",
		name: "Croacia",
		flag: "🇭🇷"
	},
	{
		id: "den",
		name: "Dinamarca",
		flag: "🇩🇰"
	},
	{
		id: "jpn",
		name: "Japon",
		flag: "🇯🇵"
	},
	{
		id: "kor",
		name: "Corea del Sur",
		flag: "🇰🇷"
	},
	{
		id: "aus",
		name: "Australia",
		flag: "🇦🇺"
	},
	{
		id: "mar",
		name: "Marruecos",
		flag: "🇲🇦"
	},
	{
		id: "sen",
		name: "Senegal",
		flag: "🇸🇳"
	},
	{
		id: "gha",
		name: "Ghana",
		flag: "🇬🇭"
	},
	{
		id: "cmr",
		name: "Camerun",
		flag: "🇨🇲"
	},
	{
		id: "tun",
		name: "Tunez",
		flag: "🇹🇳"
	},
	{
		id: "nig",
		name: "Nigeria",
		flag: "🇳🇬"
	},
	{
		id: "egy",
		name: "Egipto",
		flag: "🇪🇬"
	},
	{
		id: "srb",
		name: "Serbia",
		flag: "🇷🇸"
	},
	{
		id: "sui",
		name: "Suiza",
		flag: "🇨🇭"
	},
	{
		id: "pol",
		name: "Polonia",
		flag: "🇵🇱"
	},
	{
		id: "aut",
		name: "Austria",
		flag: "🇦🇹"
	},
	{
		id: "swe",
		name: "Suecia",
		flag: "🇸🇪"
	},
	{
		id: "nor",
		name: "Noruega",
		flag: "🇳🇴"
	},
	{
		id: "ukr",
		name: "Ucrania",
		flag: "🇺🇦"
	},
	{
		id: "tur",
		name: "Turquia",
		flag: "🇹🇷"
	},
	{
		id: "gre",
		name: "Grecia",
		flag: "🇬🇷"
	},
	{
		id: "irn",
		name: "Iran",
		flag: "🇮🇷"
	},
	{
		id: "ksa",
		name: "Arabia Saudita",
		flag: "🇸🇦"
	},
	{
		id: "qat",
		name: "Qatar",
		flag: "🇶🇦"
	},
	{
		id: "alg",
		name: "Argelia",
		flag: "🇩🇿"
	},
	{
		id: "per",
		name: "Peru",
		flag: "🇵🇪"
	},
	{
		id: "chi",
		name: "Chile",
		flag: "🇨🇱"
	},
	{
		id: "par",
		name: "Paraguay",
		flag: "🇵🇾"
	},
	{
		id: "bol",
		name: "Bolivia",
		flag: "🇧🇴"
	},
	{
		id: "crc",
		name: "Costa Rica",
		flag: "🇨🇷"
	}
];
function getTeam(teamId) {
	return TEAMS.find((team) => team.id === teamId) ?? TEAMS[0];
}
//#endregion
//#region src/lib/types.ts
var PHASES = [
	{
		key: "groups",
		label: "Fase de Grupos"
	},
	{
		key: "roundOf16",
		label: "16vos"
	},
	{
		key: "roundOf8",
		label: "8vos"
	},
	{
		key: "roundOf4",
		label: "4tos"
	},
	{
		key: "semifinals",
		label: "Semifinales"
	},
	{
		key: "final",
		label: "Final"
	}
];
//#endregion
//#region src/context/app-context.tsx
var STORAGE_KEY = "quiniela_state_v1";
var SESSION_KEY = "quiniela_session_user_v1";
var HYDRATION_SAFE_NOW_ISO = "2026-01-01T00:00:00.000Z";
var PHASE_ORDER = PHASES.map((phase) => phase.key);
var MS_DAY = 1440 * 60 * 1e3;
var MS_MATCH_WINDOW = 7200 * 1e3;
function hashPin(pin) {
	let hash = 0;
	for (let i = 0; i < pin.length; i += 1) {
		hash = (hash << 5) - hash + pin.charCodeAt(i);
		hash |= 0;
	}
	return `p-${Math.abs(hash).toString(36)}`;
}
function isPinValid(pin) {
	return /^\d{6}$/.test(pin);
}
function findPhaseIndex(phase) {
	return PHASE_ORDER.indexOf(phase);
}
function getMatchesByPhase(matches, phase) {
	return matches.filter((match) => match.phase === phase);
}
function getPhaseFirstKickoff(matches, phase) {
	const sorted = [...getMatchesByPhase(matches, phase)].sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
	return new Date(sorted[0]?.kickoffAt ?? nowIso());
}
function getPreviousPhase(phase) {
	const index = findPhaseIndex(phase);
	if (index <= 0) return null;
	return PHASE_ORDER[index - 1] ?? null;
}
function isPhaseResultsComplete(matches, phase) {
	const phaseMatches = getMatchesByPhase(matches, phase);
	if (phaseMatches.length === 0) return false;
	return phaseMatches.every((match) => match.status === "final");
}
function getPhaseWindow(state, phase) {
	const override = state.windowOverrides.find((item) => item.phase === phase);
	const closesAt = override ? new Date(override.closesAt) : getPhaseFirstKickoff(state.matches, phase);
	if (override) return {
		opensAt: new Date(override.opensAt),
		closesAt
	};
	if (phase === "groups") return {
		opensAt: /* @__PURE__ */ new Date(closesAt.getTime() - 7 * MS_DAY),
		closesAt
	};
	const previousPhase = getPreviousPhase(phase);
	if (!previousPhase) return {
		opensAt: /* @__PURE__ */ new Date(closesAt.getTime() - 2 * MS_DAY),
		closesAt
	};
	const prevPhaseMatches = getMatchesByPhase(state.matches, previousPhase);
	const maxKickoff = Math.max(...prevPhaseMatches.map((match) => new Date(match.kickoffAt).getTime()));
	return {
		opensAt: new Date(maxKickoff + MS_MATCH_WINDOW),
		closesAt
	};
}
function isPhaseLocked(state, phase, now) {
	const { closesAt } = getPhaseWindow(state, phase);
	return now.getTime() >= closesAt.getTime();
}
function isPhaseOpen(state, phase, now) {
	const previous = getPreviousPhase(phase);
	const previousDone = previous ? isPhaseResultsComplete(state.matches, previous) : true;
	const { opensAt } = getPhaseWindow(state, phase);
	return previousDone && now.getTime() >= opensAt.getTime() && !isPhaseLocked(state, phase, now);
}
function getActivePhase(state, now) {
	for (const phase of PHASE_ORDER) if (isPhaseOpen(state, phase, now)) return phase;
	return "final";
}
function wasPhaseConfirmed(submissions, userId, phase) {
	return submissions.some((submission) => submission.userId === userId && submission.phase === phase);
}
function defaultMatches() {
	return [
		{
			id: "g-1",
			phase: "groups",
			groupName: "Grupo A",
			homeTeamId: "mex",
			awayTeamId: "sui",
			kickoffAt: "2026-06-11T17:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "g-2",
			phase: "groups",
			groupName: "Grupo A",
			homeTeamId: "arg",
			awayTeamId: "jpn",
			kickoffAt: "2026-06-12T00:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "g-3",
			phase: "groups",
			groupName: "Grupo B",
			homeTeamId: "eng",
			awayTeamId: "usa",
			kickoffAt: "2026-06-12T17:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "g-4",
			phase: "groups",
			groupName: "Grupo B",
			homeTeamId: "bra",
			awayTeamId: "sen",
			kickoffAt: "2026-06-13T00:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "r16-1",
			phase: "roundOf16",
			groupName: null,
			homeTeamId: "arg",
			awayTeamId: "usa",
			kickoffAt: "2026-07-03T20:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "r8-1",
			phase: "roundOf8",
			groupName: null,
			homeTeamId: "arg",
			awayTeamId: "eng",
			kickoffAt: "2026-07-09T20:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "r4-1",
			phase: "roundOf4",
			groupName: null,
			homeTeamId: "bra",
			awayTeamId: "fra",
			kickoffAt: "2026-07-14T20:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "s-1",
			phase: "semifinals",
			groupName: null,
			homeTeamId: "arg",
			awayTeamId: "bra",
			kickoffAt: "2026-07-18T20:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		},
		{
			id: "f-1",
			phase: "final",
			groupName: null,
			homeTeamId: "arg",
			awayTeamId: "eng",
			kickoffAt: "2026-07-22T20:00:00.000Z",
			status: "scheduled",
			homeGoals: null,
			awayGoals: null,
			qualifiedTeamId: null,
			manualOverride: false
		}
	];
}
function buildInitialState() {
	return {
		users: [],
		matches: defaultMatches(),
		predictions: [],
		submissions: [],
		windowOverrides: [],
		lastLiveSyncAt: null
	};
}
function readState() {
	if (typeof window === "undefined") return buildInitialState();
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) return buildInitialState();
	try {
		return JSON.parse(raw);
	} catch {
		return buildInitialState();
	}
}
function persistState(state) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function readSessionUserId() {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(SESSION_KEY);
}
function persistSessionUserId(userId) {
	if (typeof window === "undefined") return;
	if (!userId) {
		window.localStorage.removeItem(SESSION_KEY);
		return;
	}
	window.localStorage.setItem(SESSION_KEY, userId);
}
function applyAutomaticLiveStatus(state) {
	const now = /* @__PURE__ */ new Date();
	const matches = state.matches.map((match) => {
		if (match.status === "final") return match;
		const kickoff = new Date(match.kickoffAt).getTime();
		const nowMs = now.getTime();
		if (nowMs >= kickoff && nowMs < kickoff + MS_MATCH_WINDOW) return {
			...match,
			status: "live"
		};
		if (nowMs >= kickoff + MS_MATCH_WINDOW && match.homeGoals !== null && match.awayGoals !== null) return {
			...match,
			status: "final"
		};
		return match;
	});
	return {
		...state,
		matches,
		lastLiveSyncAt: now.toISOString()
	};
}
function applyAutoConfirm(state) {
	const now = /* @__PURE__ */ new Date();
	const newSubmissions = [...state.submissions];
	for (const user of state.users) for (const phase of PHASE_ORDER) {
		if (!isPhaseLocked(state, phase, now)) continue;
		if (wasPhaseConfirmed(newSubmissions, user.id, phase)) continue;
		if (!state.predictions.some((prediction) => prediction.userId === user.id && prediction.phase === phase)) continue;
		newSubmissions.push({
			userId: user.id,
			phase,
			confirmedAt: now.toISOString(),
			autoConfirmed: true
		});
	}
	return {
		...state,
		submissions: newSubmissions
	};
}
function calculateLeaderboard(state) {
	return state.users.map((user) => {
		const userPredictions = state.predictions.filter((prediction) => prediction.userId === user.id);
		const userSubmissions = state.submissions.filter((submission) => submission.userId === user.id);
		let points = 0;
		let exactHits = 0;
		for (const prediction of userPredictions) {
			const match = state.matches.find((item) => item.id === prediction.matchId);
			if (!match || match.status !== "final") continue;
			if (!userSubmissions.some((submission) => submission.phase === prediction.phase)) continue;
			const gained = computeMatchPoints({
				phase: match.phase,
				homeGoals: match.homeGoals ?? 0,
				awayGoals: match.awayGoals ?? 0,
				qualifiedTeamId: match.qualifiedTeamId
			}, {
				homeGoals: prediction.homeGoals,
				awayGoals: prediction.awayGoals,
				predictedQualifiedTeamId: prediction.predictedQualifiedTeamId
			});
			points += gained;
			if (gained === 3) exactHits += 1;
		}
		const firstConfirmedAt = userSubmissions.map((submission) => submission.confirmedAt).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
		return {
			userId: user.id,
			nickname: user.nickname,
			teamId: user.teamId,
			points,
			exactHits,
			firstConfirmedAt
		};
	}).sort((a, b) => {
		if (b.points !== a.points) return b.points - a.points;
		if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
		return (a.firstConfirmedAt ? new Date(a.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER) - (b.firstConfirmedAt ? new Date(b.firstConfirmedAt).getTime() : Number.MAX_SAFE_INTEGER);
	});
}
var AppContext = createContext(null);
function AppProvider({ children }) {
	const [ready, setReady] = useState(false);
	const [state, setState] = useState(buildInitialState);
	const [sessionUserId, setSessionUserId] = useState(null);
	useEffect(() => {
		setState(applyAutoConfirm(readState()));
		setSessionUserId(readSessionUserId());
		setReady(true);
	}, []);
	useEffect(() => {
		if (!ready) return;
		persistState(state);
	}, [ready, state]);
	useEffect(() => {
		if (!ready) return;
		persistSessionUserId(sessionUserId);
	}, [ready, sessionUserId]);
	const currentUser = useMemo(() => state.users.find((user) => user.id === sessionUserId) ?? null, [sessionUserId, state.users]);
	const activePhase = useMemo(() => {
		return getActivePhase(state, ready ? /* @__PURE__ */ new Date() : new Date(HYDRATION_SAFE_NOW_ISO));
	}, [ready, state]);
	const leaderboard = useMemo(() => calculateLeaderboard(state), [state]);
	const teamsById = useMemo(() => {
		const output = {};
		for (const user of state.users) output[user.id] = getTeam(user.teamId).flag;
		return output;
	}, [state.users]);
	const register = useCallback((payload) => {
		const email = payload.email.trim().toLowerCase();
		const nickname = payload.nickname.trim();
		const teamId = payload.teamId;
		const expectedSecret = "esto desocupao".trim().toLowerCase();
		if (!email || !nickname || !teamId) return {
			ok: false,
			message: "Todos los campos son obligatorios."
		};
		if (!isPinValid(payload.pin)) return {
			ok: false,
			message: "El PIN debe tener 6 digitos numericos."
		};
		if (payload.secretPhrase.trim().toLowerCase() !== expectedSecret) return {
			ok: false,
			message: "Palabra secreta invalida."
		};
		if (state.users.some((user) => user.email === email)) return {
			ok: false,
			message: "Ese correo ya esta registrado."
		};
		if (state.users.some((user) => user.nickname.toLowerCase() === nickname.toLowerCase())) return {
			ok: false,
			message: "Ese apodo ya esta registrado."
		};
		const adminEmails = "".split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
		const user = {
			id: crypto.randomUUID(),
			email,
			nickname,
			teamId,
			pinHash: hashPin(payload.pin),
			isAdmin: adminEmails.includes(email),
			onboardingCompleted: false,
			createdAt: nowIso()
		};
		setState((prev) => ({
			...prev,
			users: [...prev.users, user]
		}));
		setSessionUserId(user.id);
		return { ok: true };
	}, [state.users]);
	const login = useCallback((payload) => {
		const email = payload.email.trim().toLowerCase();
		const user = state.users.find((candidate) => candidate.email === email);
		if (!user) return {
			ok: false,
			message: "No existe un usuario con ese correo."
		};
		if (!isPinValid(payload.pin)) return {
			ok: false,
			message: "PIN invalido."
		};
		if (user.pinHash !== hashPin(payload.pin)) return {
			ok: false,
			message: "PIN incorrecto."
		};
		setSessionUserId(user.id);
		return { ok: true };
	}, [state.users]);
	const logout = useCallback(() => {
		setSessionUserId(null);
	}, []);
	const completeOnboarding = useCallback(() => {
		if (!currentUser) return;
		setState((prev) => ({
			...prev,
			users: prev.users.map((user) => user.id === currentUser.id ? {
				...user,
				onboardingCompleted: true
			} : user)
		}));
	}, [currentUser]);
	const canEditPhase = useCallback((phase) => {
		if (!ready || !currentUser) return false;
		const now = /* @__PURE__ */ new Date();
		if (phase !== getActivePhase(state, now)) return false;
		if (wasPhaseConfirmed(state.submissions, currentUser.id, phase)) return false;
		return !isPhaseLocked(state, phase, now);
	}, [
		ready,
		currentUser,
		state
	]);
	const value = {
		ready,
		state,
		currentUser,
		teamsById,
		activePhase,
		leaderboard,
		register,
		login,
		logout,
		completeOnboarding,
		savePrediction: useCallback((payload) => {
			if (!currentUser) return {
				ok: false,
				message: "Debes iniciar sesion."
			};
			if (!canEditPhase(payload.phase)) return {
				ok: false,
				message: "No puedes editar esa fase ahora."
			};
			setState((prev) => {
				const next = [...prev.predictions];
				const existingIndex = next.findIndex((item) => item.userId === currentUser.id && item.phase === payload.phase && item.matchId === payload.matchId);
				const base = {
					userId: currentUser.id,
					phase: payload.phase,
					matchId: payload.matchId,
					homeGoals: payload.homeGoals,
					awayGoals: payload.awayGoals,
					predictedQualifiedTeamId: payload.predictedQualifiedTeamId,
					updatedAt: nowIso()
				};
				if (existingIndex >= 0) next[existingIndex] = base;
				else next.push(base);
				return {
					...prev,
					predictions: next
				};
			});
			return { ok: true };
		}, [canEditPhase, currentUser]),
		confirmPhase: useCallback((phase) => {
			if (!currentUser) return {
				ok: false,
				message: "Debes iniciar sesion."
			};
			if (!canEditPhase(phase)) return {
				ok: false,
				message: "Esta fase ya no se puede confirmar."
			};
			if (!state.predictions.some((prediction) => prediction.userId === currentUser.id && prediction.phase === phase)) return {
				ok: false,
				message: "Debes guardar al menos un partido."
			};
			setState((prev) => ({
				...prev,
				submissions: [...prev.submissions, {
					userId: currentUser.id,
					phase,
					confirmedAt: nowIso(),
					autoConfirmed: false
				}]
			}));
			return { ok: true };
		}, [
			canEditPhase,
			currentUser,
			state.predictions
		]),
		refreshLive: useCallback(() => {
			setState((prev) => applyAutoConfirm(applyAutomaticLiveStatus(prev)));
		}, []),
		setMatchResult: useCallback((payload) => {
			if (!currentUser?.isAdmin) return {
				ok: false,
				message: "Solo admin puede editar resultados."
			};
			setState((prev) => ({
				...prev,
				matches: prev.matches.map((match) => match.id === payload.matchId ? {
					...match,
					status: payload.status,
					homeGoals: payload.homeGoals,
					awayGoals: payload.awayGoals,
					qualifiedTeamId: payload.qualifiedTeamId,
					manualOverride: true
				} : match)
			}));
			return { ok: true };
		}, [currentUser?.isAdmin]),
		setPhaseOverride: useCallback((phase, opensAt, closesAt) => {
			if (!currentUser?.isAdmin) return;
			setState((prev) => {
				const next = prev.windowOverrides.filter((item) => item.phase !== phase);
				next.push({
					phase,
					opensAt,
					closesAt
				});
				return {
					...prev,
					windowOverrides: next
				};
			});
		}, [currentUser?.isAdmin]),
		resetUserPin: useCallback((userId, newPin) => {
			if (!currentUser?.isAdmin) return {
				ok: false,
				message: "Solo admin puede resetear PIN."
			};
			if (!isPinValid(newPin)) return {
				ok: false,
				message: "El nuevo PIN debe tener 6 digitos."
			};
			setState((prev) => ({
				...prev,
				users: prev.users.map((user) => user.id === userId ? {
					...user,
					pinHash: hashPin(newPin)
				} : user)
			}));
			return { ok: true };
		}, [currentUser?.isAdmin]),
		canEditPhase,
		isPhaseConfirmed: useCallback((phase) => {
			if (!currentUser) return false;
			return wasPhaseConfirmed(state.submissions, currentUser.id, phase);
		}, [currentUser, state.submissions]),
		isPhaseLockedAtNow: useCallback((phase) => {
			if (!ready) return false;
			return isPhaseLocked(state, phase, /* @__PURE__ */ new Date());
		}, [ready, state]),
		getPhaseWindowAtNow: useCallback((phase) => {
			return getPhaseWindow(state, phase);
		}, [state])
	};
	return /* @__PURE__ */ jsx(AppContext.Provider, {
		value,
		children
	});
}
function useApp() {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
	return ctx;
}
//#endregion
//#region src/lib/cn.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
export { TEAMS as a, toVenDateTimeInputValue as c, PHASES as i, toVenDateTimeLabel as l, AppProvider as n, getTeam as o, useApp as r, fromVenDateTimeInput as s, cn as t };
