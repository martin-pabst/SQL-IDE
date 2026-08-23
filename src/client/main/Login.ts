import * as monaco from 'monaco-editor';
import { ajax } from "../communication/AjaxHelper.js";
import { getUserDisplayName, LoginRequest, LoginResponse, LogoutRequest, UserData, type Application } from "../communication/Data.js";
import { PushClientManager } from "../communication/pushclient/PushClientManager.js";
import { AutoLogout } from "./AutoLogout.js";
import { Main } from "./Main.js";
import { UserMenu } from "./gui/UserMenu.js";
import jQuery from "jquery";
import { PruefungManagerForStudents } from './pruefung/PruefungManagerForStudents.js';
import { LoginMessages } from './gui/language/LoginMessages.js';
import { Constants } from '../Constants.js';
import { Settings } from '../settings/Settings.js';

export class Login {

    loggedInWithVidis: boolean = false;
    vidis_id_token: string = "";

    constructor(private main: Main) {
        new AutoLogout(this);
    }

    loginWithVidis(singleUseToken: string) {
        this.loggedInWithVidis = true;
        jQuery('#login').hide();
        jQuery('#main').css('visibility', 'visible');

        jQuery('#bitteWartenText').html('Bitte warten ...');
        jQuery('#bitteWarten').css('display', 'flex');
        this.sendLoginRequest(singleUseToken);
    }

    initGUI() {

        let $loginSpinner = jQuery('#login-spinner>img');

        jQuery('#login-username').focus();

        jQuery('#login-username').on('keydown', (e) => {
            if (e.key == "Enter") {
                jQuery('#login-password').focus();
            }
        });

        jQuery('#login-password').on('keydown', (e) => {
            if (e.key == "Enter") {
                jQuery('#login-button').trigger('click');
            }
        });

        jQuery('#login-password').on('keydown', (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                jQuery('#login-button').focus();
                jQuery('#login-button').addClass('jo_active');
            }
            if (e.key == "Enter") {
                jQuery('#login-button').trigger('click');
            }
        });

        jQuery('#login-button').on('keydown', (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                jQuery('#login-username').focus();
                jQuery('#login-button').removeClass('jo_active');
            } else {
                jQuery('#login-button').trigger('click');
            }
        });

        // Avoid double login when user does doubleclick:
        let loginHappened = false;
        jQuery('#login-button').on('click', () => {

            $loginSpinner.show();

            if (loginHappened) return;
            loginHappened = true;

            setTimeout(() => {
                loginHappened = false;
            }, 1000);


            this.sendLoginRequest();

        });

        jQuery('#buttonLogout').on('click', () => {

            this.logout();
        });


    }

    logout() {

        let isSilent = window.location.href.indexOf('silent') >= 0;
        if (!this.main.user || this.main.user.is_testuser) {
            window.location.assign("/" + (isSilent ? "?silent=true" : ""));
            return;
        }

        this.main.waitOverlay.show('Bitte warten, der letzte Bearbeitungsstand wird noch gespeichert ...');

        if (this.main.workspacesOwnerId != this.main.user.id) {
            this.main.teacherExplorer.onHomeButtonClicked();
        }

        PushClientManager.getInstance().close();

        this.main.notifier.connect(null);

        let logoutRequest: LogoutRequest = {
            currentWorkspaceId: this.main.currentWorkspace?.pruefung_id == null ? this.main.currentWorkspace?.id : null
        }

        this.main.networkManager.sendUpdatesAsync().then(() => {

            this.main.pruefungManagerForStudents?.stopPruefung(false);

            ajax('logout', logoutRequest, () => {
                // window.location.href = 'index.html';

                if (this.loggedInWithVidis) {
                    // window.location.assign("https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/logout?ID_TOKEN_HINT=" + this.vidis_id_token + "&post_logout_redirect_uri=https%3A%2F%2Fonline-ide.de/vidisLogout");
                    window.location.assign("https://aai.vidis.schule/auth/realms/vidis/protocol/openid-connect/logout?ID_TOKEN_HINT=" + this.vidis_id_token + "&post_logout_redirect_uri=https%3A%2F%2Fsql-ide.de/vidisLogout");
                } else {
                    window.location.assign("/" + (isSilent ? "?silent=true" : ""));

                }

            });


        });


    }


    sendLoginRequest(singleUseToken?: string) {

        let that = this;
        let $loginSpinner = jQuery('#login-spinner>img');
        $loginSpinner.show();

        let loginRequest: LoginRequest = {
            username: singleUseToken ? "" : <string>jQuery('#login-username').val(),
            password: singleUseToken ? "" : <string>jQuery('#login-password').val(),
            application: Constants.Application,
            singleUseToken: singleUseToken || null
        }

        ajax('login', loginRequest, (response: LoginResponse) => {

            if (!response.success) {
                jQuery('#login-message').html('Fehler: Benutzername und/oder Passwort ist falsch.');
            } else {

                if (response.penaltyTimeInSeconds > 0) {
                    jQuery('#login-message').html(LoginMessages.penaltyTime(response.penaltyTimeInSeconds));
                    jQuery('#login-spinner>img').hide();
                    return;
                }

                this.loggedInWithVidis = response.vidis_id_token != null;
                this.vidis_id_token = response.vidis_id_token;

                PushClientManager.getInstance().open();

                // We don't do this anymore for security reasons - see AjaxHelper.ts
                // Alternatively we now set a long expiry interval for cookie.
                // credentials.username = loginRequest.username;
                // credentials.password = loginRequest.password;

                jQuery('#login').hide();

                this.main.waitOverlay.show('Bitte warten...');

                let user: UserData = response.user;
                if (user.sql_gui_state == null || user.sql_gui_state.helperHistory == null) {
                    user.sql_gui_state = {
                        helperHistory: {
                            newFileHelperDone: false
                        },
                        viewModes: null,
                        language: "de"
                    }
                }

                this.main.settings = new Settings(user, response.userSettings, response.classSettings, response.schoolSettings);

                this.main.waitForGUICallback = () => {

                    let user: UserData = response.user;

                    that.main.mainMenu.initGUI(user);

                    that.main.bottomDiv.gradingManager.initGUI(user);

                    that.main.waitOverlay.hide();
                    $loginSpinner.hide();
                    jQuery('#menupanel-username').html(getUserDisplayName(user));

                    new UserMenu(that.main).init();

                    if (user.is_teacher) {
                        that.main.initTeacherExplorer(response.classdata);
                    }

                    that.main.user = user;

                    that.main.restoreWorkspaces(response.workspaces);
                    that.main.workspacesOwnerId = user.id;

                    that.main.networkManager.initializeTimer();

                    that.main.viewModeController.initViewMode();
                    that.main.bottomDiv.hideHomeworkTab();

                    that.main.networkManager.initializePushClientManager();

                    this.main.pruefungManagerForStudents?.close();

                    if (!user.is_teacher && !user.is_admin && !user.is_schooladmin) {
                        this.main.pruefungManagerForStudents = new PruefungManagerForStudents(this.main);
                        if (response.activePruefung != null) {

                            let workspaceData = this.main.workspaceList.filter(w => w.pruefung_id == response.activePruefung.id)[0].getWorkspaceData(true);

                            this.main.pruefungManagerForStudents.startPruefung(response.activePruefung);
                        }
                    }


                }

                if (this.main.startupComplete == 0) {
                    this.main.waitForGUICallback();
                    this.main.waitForGUICallback = null;
                }

            }

        }, (errorMessage: string) => {
            jQuery('#login-message').html('Login gescheitert: ' + errorMessage);
            jQuery('#login-spinner>img').hide();
        }
        );

    }

}