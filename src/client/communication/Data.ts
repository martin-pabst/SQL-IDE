export type UserSettings = {
    helperHistory: {
        newWorkspaceHelperDone: boolean,
        newFileHelperDone: boolean,
        speedControlHelperDone: boolean,
        consoleHelperDone: boolean,
        homeButtonHelperDone: boolean,
        stepButtonHelperDone: boolean,
        repositoryButtonDone: boolean,
        folderButtonDone: boolean
    },
    //    theme: string,  // old!
    viewModes: ViewModes,
    classDiagram: any
}

export type ViewModes = {
    presentation: ViewMode;
    monitor: ViewMode;
    viewModeChosen: "presentation" | "monitor"
}

export type ViewMode = {
    theme: string;
    fontSize: number;
    highContrast: boolean;
}


export type WorkspaceSettings = {
    libraries: string[]
}

export type FileData = {
    name: string,
    id: number,
    text: string,
    text_before_revision: string,
    submitted_date: string,
    student_edited_after_revision: boolean,
    version: number,
    workspace_id: number,
    forceUpdate: boolean,
    file_type: number
}

export type WorkspaceData = {
    id: number,
    name: string,
    path: string,
    isFolder: boolean,
    owner_id: number,
    files: FileData[],
    currentFileId?: number,
    settings?: string,       // serialized WorkspaceSettings
    sql_history: string,
    permissions: number,
    database_id: number, 
    template_id: number
}

export type CreateWorkspaceData = {
    id: number,
    name: string,
    path: string,
    isFolder: boolean,

    template_database_id?: number,
    secret?: string,
    otherDatabaseId?: number
}



export type Workspaces = {
    workspaces: WorkspaceData[]
}


export type UserData = {
    id: number,
    klasse_id: number,
    schule_id: number,
    is_teacher: boolean,
    is_admin: boolean,
    is_schooladmin: boolean,
    username: string,
    familienname: string,
    rufname: string,
    currentWorkspace_id?: number,
    settings?: UserSettings,
    password?: string,
    is_testuser?: boolean
}

export type GetUserDataRequest = {

}

export type GetUserDataResponse = {
    success: boolean,
    user: UserData,
    classdata: ClassData[], // null if !is_teacher
    schoolName: string
}

export type GetSchoolDataRequest = {
    school_id: number
}

export type GetSchoolDataResponse = {
    success: boolean,
    schoolData?: SchoolData[]
}

export type GetClassesDataRequest = {
    school_id: number
}

export type GetClassesDataResponse = {
    success: boolean,
    classDataList: ClassData[]
}

export type GetTeacherDataRequest = {
    school_id: number
}

export type GetTeacherDataResponse = {
    success: boolean,
    teacherData?: TeacherData[]
}

export type ClassData = {
    id: number,
    lehrkraft_id: number,
    schule_id: number,
    name: string,
    students: UserData[],
    aktiv: boolean,
    text?: string
}

export type SchoolData = {
    id: number,
    name: string,
    kuerzel: string,
    classes: ClassData[]
    usersWithoutClass: UserData[]
}

export type TeacherData = {
    userData: UserData,
    classes: ClassData[]
}

export type LoginRequest = {
    username: string,
    password: string,
    language: number
}

export type TicketLoginRequest = {
    ticket: string,
    language: number
}

export type LoginResponse = {
    success: boolean,
    user: UserData,
    classdata: ClassData[], // null if !is_teacher
    workspaces: Workspaces,
    isTestuser: boolean
}

export type LogoutRequest = {
    currentWorkspaceId: number
}

export type LogoutResponse = {
    success: boolean
}

export type SendUpdatesRequest = {
    workspacesWithoutFiles: WorkspaceData[],
    files: FileData[],
    owner_id: number,
    userId: number,
    language: number,
    currentWorkspaceId: number,
    getModifiedWorkspaces: boolean
}

export type SendUpdatesResponse = {
    workspaces: Workspaces,
    filesToForceUpdate: FileData[],
    success: boolean
}

export type UpdateUserSettingsRequest = {
    settings: UserSettings,
    current_workspace_id: number
    userId: number
}

export type UpdateUserSettingsResponse = {
    success: boolean;

}


export type CreateOrDeleteFileOrWorkspaceRequest = {
    entity: "workspace" | "file",
    type: "create" | "delete",
    data?: CreateWorkspaceData | FileData, // in case of create
    id?: number, // in case of delete
    owner_id?: number, // in case of create
    userId: number
}

export type CRUDResponse = {
    success: boolean,
    id?: number, // in case of create
    error: string
}

export type CRUDUserRequest = {
    type: "create" | "update" | "delete",
    data?: UserData, // for create and update
    ids?: number[], // for delete
}

export type CRUDClassRequest = {
    type: "create" | "update" | "delete",
    data?: ClassData, // for create and update
    ids?: number[], // for delete
}

export type CRUDSchoolRequest = {
    type: "create" | "update" | "delete",
    data?: SchoolData, // for create and update
    id?: number, // for delete
}

export type BulkCreateUsersRequest = {
    onlyCheckUsernames: boolean, 
    users: UserData[],
    schule_id: number
}

export type BulkCreateUsersResponse = {
    success: boolean,
    namesAlreadyUsed: string[],
    message: string
}

export type GetWorkspacesRequest = {
    ws_userId: number,
    userId: number,
    language: number
}

export type GetWorkspacesResponse = {
    success: boolean,
    workspaces: Workspaces
}

export type ChangeClassOfStudentsRequest = {
    student_ids: number[],
    new_class_id: number
}

export type ChangeClassOfStudentsResponse = {
    success: boolean,
    message: string
}


/**
 * Copies Workspace and returns copy.
 */
export type DuplicateWorkspaceRequest = {
    workspace_id: number, // Workspace to copy
    language: number
}

export type DuplicateWorkspaceResponse = {
    workspace: WorkspaceData, // new Workspace (with copied files)
    message: string
}

/**
 * Creates Repository and links it with given workspace
 */
export type CreateRepositoryRequest = {
    workspace_id: number, // Workspace to copy
    publish_to: number // 0 == private, 1 == class, 2 == school
}

export type CreateRepositoryResponse = {
    message: string
}

export type DeleteRepositoryRequest = {
    repository_id: number
}

export type DeleteRepositoryResponse = { success: boolean, message?: string };


/**
 * Distributes given workspace to all students in given class
 */
export type DistributeWorkspaceRequest = {
    workspace_id: number, // Workspace to copy
    language: number, // 0 == Java, 1 == SQL
    class_id: number,
    student_ids: number[]
}

export type DistributeWorkspaceResponse = {
    message: string
}


export type GetStatisticsRequest = {
    now: boolean
}

export type StatisticData = {
    users: number,
    memory: number,
    time: string,
    requestsPerMinute: number,
    userlist?: string[],
    webSocketSessionCount: number,
    webSocketClientCount: number,
    webSocketRequestPerSecond: number,
    performanceDataList: PerformanceData[]
}

export type PerformanceData = {
    url: string;
    sumTime: number;
    count: number;
}

export type CollectPerformanceDataRequest = {
    data: PerformanceData[]
}

export type GetStatisticsResponse = {
    success: boolean,
    statisticPeriodSeconds: number,
    data: StatisticData[]
}

export type RepositoryFileEntry = {
    id: number,
    version: number,
    filename: string,
    text: string
}

export type RepositoryHistoryFileEntry = {
    id: number,
    version: number,
    type: "change" | "create" | "delete" | "intermediate",
    filename?: string, // if type == "create" || type == "intermediate" || type == "change" and filename has changed
    content?: string, // if type == "create" || type == "intermediate"
    changeSet?: string // if "change" and not only filename has changed
}

export type RepositoryHistoryEntry = {
    timestamp: string,
    version: number,
    userId: number,
    username: string,
    name: string,
    comment: string,
    isIntermediateEntry: boolean, // true, if entry contains complete code of all files
    historyFiles: RepositoryHistoryFileEntry[]
}


export type Repository = {
    id: number,
    name: string,
    owner_id: number,
    schule_id: number,
    files: string,

    fileEntries?: RepositoryFileEntry[], // deserialized field files

    history: string,

    historyEntries?: RepositoryHistoryEntry[],

    version: number,
    published_to: number,
    description: string
}


export type GetRepositoryRequest = {
    repository_id: number,
    workspace_id: number
}

export type GetRepositoryResponse = {
    success: boolean,
    message: string,
    repository: Repository
}

export type CommitFilesRequest = {
    repository_id: number,
    workspace_id: number,
    repositoryHistoryEntry: RepositoryHistoryEntry,
    files: RepositoryFileEntry[], // current state of workspace files
    repositoryVersionBeforeCommit: number,
    newlyVersionedFileIds: number[]
}

export type CommitFilesResponse = {
    success: boolean,
    message: string,
    repositoryOutOfSync: boolean,
    repository: Repository
};

export type RepositoryUser = {
    user_id: number,
    username: string,
    firstName: string,
    lastName: string,
    klasse: string,
    canWrite: boolean
}

export type GetRepositoryUserListRequest = {
    repository_id: number
}

export type GetRepositoryUserListResponse = {
    success: boolean,
    message: string,
    repositoryUserList: RepositoryUser[]
}

export type RepositoryInfo = {
    id: number,
    name: string,
    owner_id: number,
    owner_name: string,
    owner_username: string,
    schule_id: number,
    klasse_id: number,
    version: number,
    published_to: number,
    description: string
}

export type GetRepositoryListRequest = {
    onlyOwnRepositories: boolean
}

export type GetRepositoryListResponse = {
    success: boolean,
    message: string,
    repositories: RepositoryInfo[]
}

export type UpdateRepositoryRequest = {
    repository_id: number,
    owner_id: number,
    // published_to 0: none; 1: class; 2: school; 3: all
    published_to: number,
    description: string,
    name: string
}

export type UpdateRepositoryResponse = {
    success: boolean,
    message: string
}

export type AttachWorkspaceToRepositoryRequest = {
    createNewWorkspace: boolean,
    workspace_id?: number,
    repository_id: number
}

export type AttachWorkspaceToRepositoryResponse = { message?: string, new_workspace?: WorkspaceData };

export type RepositoryUserWriteAccessData = {
    user_id: number,
    has_write_access: boolean
}

export type UpdateRepositoryUserWriteAccessRequest = {
    repository_id: number,
    writeAccessList: RepositoryUserWriteAccessData[]
}

export type UpdateRepositoryUserWriteAccessResponse = { success: boolean, message: string }

export type GainRepositoryLockRequest = { repository_id: number }

export type GainRepositoryLockResponse = { success: boolean, message: string }

export type LeaseRepositoryLockRequest = { repository_id: number }

export type LeaseRepositoryLockResponse = { success: boolean, message: string }



// WebSocket

export type GetWebSocketTokenResponse = { success: boolean, token?: string }

export type WebSocketRequestConnect = {
    command: 1,
    token: string,
    databaseId: number,
    workspaceId: number, 
    databaseVersion: number
}

export type WebSocketRequestGetNewStatements = {
    command: 2
    databaseVersion: number
}

export type WebSocketRequestDisconnect = {
    command: 4
}

export type WebSocketRequestKeepAlive = {
    command: 5
}

export type WebSocketResponse = WebSocketResponseSendingStatements | WebSocketResponseDisconnect | WebSocketResponseKeepAlive;

export type WebSocketResponseSendingStatements = {
    command: 2,
    firstNewStatementIndex: number,  // -1 => Database doesn't exist
    newStatements: string[]
}

export type WebSocketResponseDisconnect = {
    command: 3
}

export type WebSocketResponseKeepAlive = {
    command: 4
}


export type DatabaseData = {
    id: number,
    name: string,
    owner_id: number,
    schule_id: number,
    template_id: number,
    template: DatabaseData,
    statements: string[],
    published_to: number,
    version: number,
    description: string,
    id_old_version_of_id: number
}

export type GetDatabaseRequest = {
    workspaceId: number,
    templateNeeded: boolean
}

export type getDatabaseResponse = {
    success: boolean,
    database: DatabaseData,
    error: string
}

export type GetNewStatementsRequest = {
    workspaceId: number,
    version_before: number
}

export type GetNewStatementsResponse = {
    success: Boolean,
    newStatements: string[],
    firstNewStatementIndex: number
}

export type AddDatabaseStatementsRequest = {
    workspaceId: number,
    version_before: number,
    statements: string[]
}

export type AddDatabaseStatementsResponse = {
        success: Boolean,
        statements_before: string[],
        new_version: number
}
    
export type TemplateListEntry = {
    id: number,
    name: string,
    published_to: number,
    description: string,
    ownerName: string,
    $tle: JQuery<HTMLDivElement>
}

export type GetTemplateListRequest = {
    user_id: number
}

export type GetTemplateListResponse = {
    success: boolean,
    error: string,
    templateList: TemplateListEntry[]
}

export type GetDatabaseSettingsRequest = {
    workspaceId: number
}

export type Secrets = {
    read: string,
    write: string,
    ddl: string
}

export type GetDatabaseSettingsResponse = {
    success: boolean,
    workspaceId: number,
    secrets: Secrets,
    publishedTo: number,
    error: string
}

export type setDatabaseSecretRequest = {
    workspaceId: number,
    secretKind: string
}

export type SetDatabaseSecretResponse = {
    success: boolean,
    secret: string,
    error: string
}

export type SetPublishedToRequest = {
    workspaceId: number,
    publishedTo: number,
    databaseName: string
}

export type SetPublishedToResponse = {
    success: boolean,
    error: string
}