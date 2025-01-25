import { MainBase } from "../MainBase.js";
import { Table, Column } from "../../compiler/parser/SQLTable.js";
import { DatabaseStructure } from "../../tools/DatabaseTools.js";
import { downloadFile, openContextMenu } from "../../tools/HtmlTools.js";


export class DatabaseExplorer {

    collapsedTables: Map<string, boolean> = new Map();

    constructor(private main: MainBase, public $mainDiv: JQuery<HTMLElement>) {

    }

    refresh() {

        let dbTool = this.main.getDatabaseTool();

        dbTool.retrieveDatabaseStructure((dbstructure: DatabaseStructure) => {

            this.refreshAfterRetrievingDBStructure();
        });

    }

    clear() {
        this.$mainDiv.empty();
    }

    refreshAfterRetrievingDBStructure() {
        let dbTool = this.main.getDatabaseTool();
        let workspace = this.main.getCurrentWorkspace();
        if (workspace != null) {
            for (let m of workspace.moduleStore.getModules(false)) {
                m.file.dirty = true;
            }
        }

        let tables = Table.fromTableStructureList(dbTool.databaseStructure.tables);

        this.$mainDiv.empty();

        for (let table of tables) {
            if (table.identifier != "sqlite_sequence") {
                let $table = this.renderTable(table);
                this.$mainDiv.append($table);
            }
        }

    }

    renderTable(table: Table): JQuery<HTMLElement> {
        let isCollapsed = this.collapsedTables.get(table.identifier) != null;

        let $table = jQuery(
            `<div class="jo_table">
           <div class="jo_tableheader">
              <div class="${isCollapsed ? 'img_tree-collapsed-dark' : 'img_tree-expanded-dark'} jo_treeswitch jo_button jo_active"></div>
              <div class="jo_tableheaderlink">
                <div class="${table.type == "table" ? "img_table" : "img_view"}"></div>
                <div>${table.identifier}</div></div><div class="jo_tablesize">(${table.type == "view" ? "View, " : ""}${table.size}&nbsp;Datensätze)</div>
              </div>
            </div>
        </div>`);


        const $tableHeader = $table.find('.jo_tableheader');

        $tableHeader[0].addEventListener("contextmenu", (e) => { e.preventDefault() });

        $tableHeader.on('pointerup', (e) => {
            if (e.button == 0) this.main.getResultsetPresenter().showTable(table);
            if (e.button == 2) {
                openContextMenu([
                    {
                        caption: "CSV-Export",
                        callback: () => {
                            this.csvExport(table);
                        }
                    },
                    {
                        caption: "Abbrechen",
                        callback: () => {
                            // nothing to do.
                        }
                    }
                ], e.pageX + 2, e.pageY + 2);
                e.stopPropagation();
            }
        })

        let $columns = jQuery('<div class="jo_columnlist"></div>')

        for (let column of table.columns) {
            let image = column.isPrimaryKey ? "img_key" : "img_column";

            let referencesHtml = "";
            if (column.references != null) {
                referencesHtml = `<div class="img_foreign_key" style="margin-left: 5px"></div><div class="jo_references">${column.references.table.identifier}.${column.references.identifier}</div>`
            }

            let type = column.type == null ? "" : column.type.toString();

            let notNull: string = column.notNull ? '<div class="jo_dbnotnull">not null</div>' : "";
            let defaultValue: string = column.defaultValue ? `<div class="jo_dbdefault">default ${column.defaultValue}</div>` : "";
            let autoincrement: string = column.isAutoIncrement ? `<div class="jo_dbautoincrement">autoincrement</div>` : "";

            let $column = jQuery(`
            <div class="jo_column">
                <div class="${image}"></div>
                <div>${column.identifier}</div>
                <div class="jo_dbtype">${type}</div>
                ${autoincrement}
                ${referencesHtml}
                ${notNull}
                ${defaultValue}
            </div>
            `);
            $columns.append($column);
        }

        $table.append($columns);

        let $treeSwitch = $table.find('.jo_treeswitch');
        let that = this;
        $treeSwitch.on('pointerup', (e) => {
            e.stopPropagation();
            let $columnList = $treeSwitch.parents('.jo_table').find('.jo_columnlist');
            let collapsed = $treeSwitch.hasClass('img_tree-collapsed-dark');
            if (collapsed) {
                $treeSwitch.removeClass('img_tree-collapsed-dark');
                $treeSwitch.addClass('img_tree-expanded-dark');
                $columnList.slideDown(300);
                that.collapsedTables.delete(table.identifier);
            } else {
                $treeSwitch.removeClass('img_tree-expanded-dark');
                $treeSwitch.addClass('img_tree-collapsed-dark');
                $columnList.slideUp(300);
                that.collapsedTables.set(table.identifier, true);
            }
        });

        return $table;
    }

    csvExport(table: Table){
        let statement = "select * from " + table.identifier + ";";
        this.main.getDatabaseTool().executeQuery(statement,
            (results) => {
                let file: string = "";
                // file += table.columns.map(c => c.identifier).join("; ") + "\n";
                const result = results.pop();
                if(result){
                    file += result.columns.map(c => `"${c}"`).join(",") + "\n";
                    file += result.values.map(line => line.map(c => `"${c}"`).join(",")).join("\n");
                }
                downloadFile("\ufeff" + file, table.identifier + ".csv", false);
            },
            (error) => { });

    }

}