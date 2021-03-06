import { ajax } from "../communication/AjaxHelper.js";
import { LoginRequest, LoginResponse, LogoutRequest, UserData } from "../communication/Data.js";
import { Main } from "./Main.js";
import { Helper } from "./gui/Helper.js";
import { userInfo } from "os";
import { UserMenu } from "./gui/UserMenu.js";
import { escapeHtml } from "../tools/StringTools.js";

export class Login {


    constructor(private main: Main) {

    }

    initGUI() {

        let that = this;

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

            let loginRequest: LoginRequest = {
                username: <string>jQuery('#login-username').val(),
                password: <string>jQuery('#login-password').val(),
                language: 1
            }

            ajax('login', loginRequest, (response: LoginResponse) => {

                if (!response.success) {
                    jQuery('#login-message').html('Fehler: Benutzername und/oder Passwort ist falsch.');
                } else {

                    // We don't do this anymore for security reasons - see AjaxHelper.ts
                    // Alternatively we now set a long expiry interval for cookie.
                    // credentials.username = loginRequest.username;
                    // credentials.password = loginRequest.password;

                    jQuery('#login').hide();

                    this.main.waitOverlay.show('Bitte warten...');

                    let user: UserData = response.user;
                    if (user.settings == null || user.settings.helperHistory == null) {
                        user.settings = {
                            helperHistory: {
                            },
                            viewModes: null,
                            classDiagram: null
                        }
                    }

                    this.main.waitForGUICallback = () => {

                        that.main.mainMenu.initGUI(user);

                        that.main.waitOverlay.hide();
                        $loginSpinner.hide();
                        jQuery('#menupanel-username').html(escapeHtml(user.rufname) + " " + escapeHtml(user.familienname));

                        new UserMenu(that.main).init();

                        if (user.is_teacher) {
                            that.main.initTeacherExplorer(response.classdata);
                        }

                        that.main.user = user;

                        that.main.restoreWorkspaces(response.workspaces);
                        that.main.workspacesOwnerId = user.id;

                        that.main.networkManager.initializeTimer();

                        that.main.projectExplorer.fileListPanel.setFixed(!user.is_teacher);
                        that.main.projectExplorer.workspaceListPanel.setFixed(!user.is_teacher);

                        that.main.viewModeController.initViewMode();
                        that.main.bottomDiv.hideHomeworkTab();

                        that.main.networkManager.initializeNotifierClient();

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

        });

        jQuery('#buttonLogout').on('click', () => {

            this.main.waitOverlay.show('Bitte warten, der letzte Bearbeitungsstand wird noch gespeichert ...');

            if (this.main.workspacesOwnerId != this.main.user.id) {
                this.main.projectExplorer.onHomeButtonClicked();
            }

            this.main.networkManager.sendUpdates(() => {

                let logoutRequest: LogoutRequest = {
                    currentWorkspaceId: this.main.currentWorkspace?.id
                }

                ajax('logout', logoutRequest, () => {
                    // window.location.href = 'index.html';
                    this.main.networkManager.sendUpdateUserSettings(() => {});

                    jQuery('#login').show();
                    this.main.waitOverlay.hide();
                    jQuery('#login-message').empty();
                    this.main.getMonacoEditor().setModel(monaco.editor.createModel("", "myJava"));
                    this.main.projectExplorer.fileListPanel.clear();
                    this.main.projectExplorer.workspaceListPanel.clear();

                    this.main.databaseExplorer.clear();
                    this.main.resultsetPresenter.clear();

                    if (this.main.user.is_teacher) {
                        this.main.teacherExplorer.removePanels();
                        this.main.teacherExplorer = null;
                    }


                    this.main.currentWorkspace = null;
                    this.main.user = null;


                });
            }, true);

        });


    }


}