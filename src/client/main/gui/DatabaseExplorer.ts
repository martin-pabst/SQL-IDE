import { MainBase } from "../MainBase.js";
import { Table, Column } from "../../compiler/parser/SQLTable.js";
import { DatabaseStructure } from "../../tools/DatabaseTools.js";

export class DatabaseExplorer {
    
    collapsedTables: Map<string, boolean> = new Map();

    constructor(private main: MainBase, public $mainDiv: JQuery<HTMLElement>){

    }

    refresh(){

        let dbTool = this.main.getDatabaseTool();

        dbTool.retrieveDatabaseStructure((dbstructure: DatabaseStructure) => {

            this.refreshAfterRetrievingDBStructure();
        });

    }

    refreshAfterRetrievingDBStructure(){
        let dbTool = this.main.getDatabaseTool();
        let workspace = this.main.getCurrentWorkspace();
        if(workspace != null){
            for(let m of workspace.moduleStore.getModules(false)){
                m.file.dirty = true;
            }
        }

        let tables = Table.fromTableStructureList(dbTool.databaseStructure.tables);

        this.$mainDiv.empty();

        for(let table of tables){
            let $table = this.renderTable(table);
            this.$mainDiv.append($table);
        }

    }

    renderTable(table: Table): JQuery<HTMLElement> {
        let isCollapsed = this.collapsedTables.get(table.identifier) != null;

        let $table = jQuery(
        `<div class="jo_table">
           <div class="jo_tableheader">
              <div class="${isCollapsed ? 'img_tree-collapsed-dark' : 'img_tree-expanded-dark'} jo_treeswitch jo_button jo_active"></div>
              <div class="jo_tableheaderlink">
                <div class="img_table"></div>
                <div>${table.identifier}</div><div style="flex: 1"></div><div class="jo_tablesize">(${table.size} Datensätze)</div>
              </div>
            </div>
        </div>`);

        let $columns = jQuery('<div class="jo_columnlist"></div>')

        for(let column of table.columns){
            let image = column.isPrimaryKey ? "img_key" : "img_column";

            let referencesHtml = "";
            if(column.references != null){
                referencesHtml = `<div class="img_foreign_key" style="margin-left: 5px"></div><div class="jo_references">${column.references.table.identifier}.${column.references.identifier}</div>`
            }

            let type = column.type == null ? "" : column.type.toString();
            let notNull:string = column.notNull ? '<div class="jo_dbnotnull">not null</div>' : "";

            let $column = jQuery(`
            <div class="jo_column">
                <div class="${image}"></div>
                <div>${column.identifier}</div>
                <div class="jo_dbtype">${type}</div>
                ${referencesHtml}
                ${notNull}
            </div>
            `);
            $columns.append($column);
        }

        $table.append($columns);

        let $treeSwitch = $table.find('.jo_treeswitch');
        let that = this;
        $treeSwitch.on('click', () => {
            let collapsed = $treeSwitch.hasClass('img_tree-collapsed-dark');
            if(collapsed){
                $treeSwitch.removeClass('img_tree-collapsed-dark');
                $treeSwitch.addClass('img_tree-expanded-dark');
                $columns.slideDown(300);
                that.collapsedTables.delete(table.identifier);
            } else {
                $treeSwitch.removeClass('img_tree-expanded-dark');
                $treeSwitch.addClass('img_tree-collapsed-dark');
                $columns.slideUp(300);                
                that.collapsedTables.set(table.identifier, true);
            }
        });

        return $table;
    }



}