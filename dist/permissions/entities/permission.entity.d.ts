export declare enum Action {
    Manage = "manage",
    Create = "create",
    Read = "read",
    Update = "update",
    Delete = "delete"
}
export declare class Permission {
    id: string;
    userId: string;
    action: Action;
    subject: string;
    condition?: string | null;
    inverted: boolean;
    reason?: string | null;
}
