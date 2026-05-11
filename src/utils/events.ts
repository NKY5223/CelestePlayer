export interface HasEvents<T extends Record<string, unknown>> {
	addListener<E extends keyof T>(event: E, listener: (value: T[E]) => void): void;
	removeListener<E extends keyof T>(event: E, listener: (value: T[E]) => void): void;
}

export class EventManager<T extends Record<string, unknown>> {
	protected readonly listeners = new Map<keyof T, Set<(value: never) => void>>();
	constructor() { }

	add<E extends keyof T>(event: E, listener: (value: T[E]) => void) {
		const ls = this.listeners.getOrInsert(event, new Set());
		if (ls.has(listener)) console.warn("Duplicate listener for event '%s':", event, listener);
		else ls.add(listener);
	}
	remove<E extends keyof T>(event: E, listener: (value: T[E]) => void) {
		const ls = this.listeners.get(event);
		if (!ls) return;
		if (ls.has(listener)) ls.delete(listener);
		else console.warn("Tried to remove listener for event '%s' even though it was not attached:", event, listener);
	}
	dispatch<E extends keyof T>(event: E, value: T[E]) {
		this.listeners.get(event)?.forEach(l => l(value as never));
	}
}


type T = {};
/** Replace `T` with your own events */
class Example implements HasEvents<T> {
	protected readonly events: EventManager<T> = new EventManager();

	addListener<E extends keyof T>(event: E, listener: (value: T[E]) => void): void {
		return this.events.add(event, listener);
	}
	removeListener<E extends keyof T>(event: E, listener: (value: T[E]) => void): void {
		return this.events.remove(event, listener);
	}
}