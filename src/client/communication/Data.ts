import jQuery from "jquery";

export type Application = 1 | 2;    // 1 == OnlineIDE, 2 == SQLIDE

export interface BaseResponse {
    success: boolean;
    message: string;
}

export type GuiState = {
    helperHistory: {
        newFileHelperDone: boolean,
    },
    viewModes: ViewModes,
    language: string
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

}

export type FileData = {
    name: string,
    id: number,
    text: string,
    text_before_revision: string,
    submitted_date: string,
    student_edited_after_revision: boolean,
    version: number,
    is_copy_of_id: number,
    repository_file_version: number,
    identical_to_repository_version: boolean,
    workspace_id: number,
    forceUpdate: boolean,
    isFolder: boolean,
    parent_folder_id: number,
    sorting_order: number
}

export type WorkspaceData = {
    id: number,
    name: string,
    isFolder: boolean,
    parent_folder_id: number | null,
    sorting_order: number,

    owner_id: number,
    files: FileData[],
    current_file_id?: number,
    settings?: string,       // serialized WorkspaceSettings
    version: number,


    database_id: number,
    permissions: number,

    // Pruefung:
    pruefung_id?: number,
    readonly: boolean,
    grade?: string,
    points?: string,
    comment?: string

}

export type CreateWorkspaceData = {
    name: string,
    isFolder: boolean,
    parent_folder_id: number | null,
    id: number | null,

    // needed when new workspace is created
    template_database_id?: number,
    template_id?: number,
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
    locked: boolean,
    username: string,
    familienname: string,
    rufname: string,
    currentWorkspace_id?: number,
    sql_gui_state?: GuiState,
    password?: string,
    is_testuser?: boolean,
    sql_settings?: SettingValues,

    vidis_sub?: string,
    vidis_klasse?: string,
    vidis_akronym?: string
}

export function getUserDisplayName(user: UserData, lastNameFirst: boolean = false): string {
    if (user.vidis_akronym) {
        if (user.username && user.username.length > 0) return user.username;
        return user.vidis_akronym;
    }
    if (user.familienname?.length > 0 && user.rufname?.length > 0) {
        if (lastNameFirst) return user.familienname + ", " + user.rufname;
        return user.rufname + " " + user.familienname;
    }
    return user.username;
}

export type GetUserDataRequest = {

}

export type GetUserDataResponse = {
    success: boolean,
    user: UserData,
    classdata: ClassData[], // null if !is_teacher
    schoolName: string,
    vidisSchoolId: string | null
}

export type GetSchoolDataRequest = {
    school_id: number
}

export type GetSchoolDataResponse = {
    success: boolean,
    schoolData?: SchoolData[]
}

export type GetClassesDataRequest = {
    wholeSchool: boolean // if true, get all classes of school, else only classes of teacher
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
    teacherData?: TeacherData[],
    classesWithoutTeacher: ClassData[]
}

export type ClassData = {
    id: number,
    lehrkraft_id: number,
    zweitlehrkraft_id: number,
    schule_id: number,
    name: string,
    students: UserData[],
    aktiv: boolean,
    text?: string
}

export type SchoolData = {
    id: number,
    name: string,
    text?: string, // only form w2ui...
    kuerzel: string,
    classes: ClassData[],
    usersWithoutClass: UserData[],
    userMinutesLastMonth: number,
    userMinutesLastYear: number,
    userMinutesOverall: number
}

export type TeacherData = {
    userData: UserData,
    classes: ClassData[]
}

export type LoginRequest = {
    username: string,
    password: string,
    application: Application,
    singleUseToken: string | null
}

export type TicketLoginRequest = {
    ticket: string,
    language: number
}

// Dummy... -> Remove when Settings-Module is implemented
type SettingValues = {}

export type LoginResponse = {
    success: boolean,
    user: UserData,
    classdata: ClassData[], // null if !is_teacher
    workspaces: Workspaces,
    isTestuser: boolean,
    activePruefung: Pruefung,
    sqlIdeForOnlineIdeClient: string,
    userSettings: SettingValues,   // new user settings
    classSettings: SettingValues, // settings for class if user is student
    schoolSettings: SettingValues, // settings for school
    vidis_id_token?: string,
    penaltyTimeInSeconds: number,
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
    currentWorkspaceId: number,
    getModifiedWorkspaces: boolean
}

export type SendUpdatesResponse = {
    success: boolean,
    workspaces: Workspaces,
    filesToForceUpdate: FileData[],
    activePruefung: Pruefung
}

export type UpdateGuiStateRequest = {
    gui_state: GuiState,
    userId: number
}

export type UpdateGuiStateResponse = {
    success: boolean;

}


export type CreateOrDeleteFileOrWorkspaceRequest = {
    entity: "workspace" | "file",
    type: "create" | "delete",
    data?: CreateWorkspaceData | FileData, // in case of create
    ids?: number[], // in case of delete
    owner_id?: number, // in case of create
    userId: number
}

export type MoveFileRequest = {
    file_id: number,
    destination_workspace_id: number
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
    userId: number
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
    workspace_id: number // Workspace to copy
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
    database_as_template_id: number,
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

export type WebSocketResponse = WebSocketResponseSendingStatements | WebSocketResponseDisconnect |
    WebSocketResponseKeepAlive | WebSocketResponseRollback;

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

export type WebSocketResponseRollback = {
    command: 5,
    new_version: number
}


export type DatabaseData = {
    id: number,
    name: string,
    owner_id: number,
    schule_id: number,
    based_on_template_id: number,
    template: DatabaseData,
    statements: string[],
    published_to: number,
    description: string,
    id_old_version_of_id: number
}

export type GetDatabaseRequest = {
    workspaceId: number
}

export type getDatabaseResponse = {
    success: boolean,
    database: DatabaseData,
    version: number,
    error: string
}

export type GetNewStatementsRequest = {
    workspaceId: number,
    version_before: number
}

export type GetNewStatementsResponse = {
    success: Boolean,
    newStatements: string[],
    firstNewStatementIndex: number,
    rollbackToVersion: number
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
    ownerId: number,
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
    owner: string,
    userIsOwner: boolean,
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
    databaseName: string,
    description: string
}

export type SetPublishedToResponse = {
    success: boolean,
    error: string
}

export type GetTemplateRequest = {
    workspaceId: number
}

export type RollbackRequest = {
    workspaceId: number,
    version: number
}

export type RollbackResponse = {
    success: Boolean,
    new_version: number,
    message: string
}

export type UploadTemplateResponse = {
    success: boolean,
    newTemplateId?: number
}

export type RegisterLongPollingListenerRequest = {
    workspaceId: number
}

export type LongPollingListenerResponse = {
    success: boolean,
    message: string,
    firstNewStatementIndex?: number,
    newStatements?: string[]
}

export type RegisterPushClientForDatabaseRequest = { workspaceId: number, registerOrUnregister: "register" | "unregister" }

export type RegisterPushClientForDatabaseResponse = { success: boolean, message: string }

export type DatabaseChangedPushMessage = {
    databaseId: number,
    firstNewStatementIndex?: number,
    newStatements?: string[],
    rollbackToVersion?: number
}

export type GetSettingsRequest = {

}

export type GetSettingsResponse = {
    success: boolean,
    classSettings: {classId: number, className: string, settings: SettingValues}[] | null, // settings for classes if user is teacher
    schoolSettings: SettingValues | null // settings for school if user is schooladmin
}

export type UpdateSettingsDataRequest = {
    userId?: number,
    klasseId?: number,
    schuleId?: number,
    settings: SettingValues
}

export type UpdateSettingsDataResponse = {
    success: boolean,
    message: string
}


export type FileOrder = {
    fileId: number,
    order: number
}

export type UpdateFileOrderRequest = {
    fileOrderList: FileOrder[]
}

export type WorkspaceOrder = {
    workspaceId: number,
    order: number
}

export type UpdateWorkspaceOrderRequest = {
    workspaceOrderList: WorkspaceOrder[]
}

/*
 * Pruefung
 */

export type PruefungState = "preparing" | "running" | "correcting" | "opening";
export var PruefungCaptions: { [index: string]: string } = {
    "preparing": "Vorbereitung",
    "running": "Prüfung läuft",
    "correcting": "Korrektur",
    "opening": "Herausgabe"
}

export type PruefungStudentModeWithId = {
    student_id: number,
    mode: PruefungStudentMode
}

export type PruefungStudentGroupWithId = {
    student_id: number,
    group: string
}

export type Pruefung = {
    id: number,
    name: string,
    datum?: string,
    klasse_id: number,
    template_workspace_a_id: number,
    template_workspace_b_id: number,
    pruefungStudentGroups?: { studentGroups: PruefungStudentGroupWithId[] },
    pruefungStudentModes?: { studentModes: PruefungStudentModeWithId[] },
    state: PruefungState,
    application: Application
}

export type CRUDPruefungRequest = {
    pruefung?: Pruefung,
    requestType: "create" | "update" | "delete"
}

export type CRUDPruefungResponse = {
    success: boolean,
    newPruefungWithIds?: Pruefung,
    message: string
}



export type StudentPruefungStateInfo = {
    studentId: number,
    timestamp: number,
    state: string,
    running: boolean
}

export type GetPruefungStudentStatesRequest = {
    pruefungId: number
}

export type GetPruefungStudentStatesResponse = {
    success: boolean,
    pruefungState: string,
    pruefungStudentStates: StudentPruefungStateInfo[],
    message: string
}


// data class ReportPruefungStudentStateRequest(var pruefungId: Int, var clientState: String);
// data class ReportPruefungStudentStateResponse(var success: Boolean, var pruefungState: String, var message: String);

export type ReportPruefungStudentStateRequest = {
    pruefungId: number,
    running: Boolean
}

export type ReportPruefungStudentStateResponse = {
    success: boolean,
    pruefungState: string,
    message: string
}

export type GetPruefungStudentModeRequest = {
    pruefung_id: number
}

export type PruefungStudentMode = "automatic" | "manualOn" | "manualOff";

export type PruefungTableStudentData = {
    id: number,
    name: string,
    username: string,
    grade: string,
    points: string,
    comment: string,
    mode: PruefungStudentMode | { id: PruefungStudentMode, text: string }
    group: string | { id: string, text: string },
}

export type GetPruefungStudentTableDataRequest = {
    pruefung_id: number
}

export type GetPruefungStudentTableDataResponse = {
    success: boolean,
    message: string,
    studentDataList: PruefungTableStudentData[]
}

export type SetPruefungStudentModeRequest = {
    pruefung_id: number,
    student_id: number,
    mode: PruefungStudentMode
}

export type CheckIfPruefungIsRunningResponse = {
    runningPruefung: Pruefung | null
}

export type GetSingleUseSessionTokenResponse = {
    success: boolean,
    singleUseSessionToken: string,
    message: string
}

export type KlassData = {
    id: number;
    text: string;
}

export type WorkspaceShortData = {
    id: number,
    parent_folder_id?: number,
    sorting_order: number,
    isFolder: boolean,
    name: string,
    text?: string,
    files: string[]
}

export type GetPruefungenForLehrkraftResponse = {
    pruefungen: Pruefung[];
    klassen: KlassData[];
    workspaces: WorkspaceShortData[];
}

export type UpdatePruefungSchuelerDataRequest = {
    schuelerId: number;
    pruefungId: number;
    grade: string;
    points: string;
    mode: PruefungStudentMode;
    group: string;
    attributesToUpdate: string;
}

export type GetGradeRequest = {
    schuelerId: number;
    pruefungId: number;
}

export type GradeData = {
    user_id: number;
    pruefung_id: number;
    grade: string;
    points: string;
    comment: string;
}

export type CreateOrUpdateGradeRequest = {
    schuelerId: number;
    pruefungId: number;
    grade: string;
    points: string;
    comment: string;
}

export type GetGradeResponse = {
    grade: GradeData;
    success: boolean;
    message: string;
}

