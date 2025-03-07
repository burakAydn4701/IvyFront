declare module '@rails/actioncable' {
  export function createConsumer(url?: string): Consumer;

  export interface Consumer {
    subscriptions: Subscriptions;
    disconnect(): void;
    connect(): void;
  }

  export interface Subscriptions {
    create(params: object, callbacks: object): Subscription;
    remove(subscription: Subscription): void;
  }

  export interface Subscription {
    unsubscribe(): void;
    perform(action: string, data?: object): void;
  }
} 