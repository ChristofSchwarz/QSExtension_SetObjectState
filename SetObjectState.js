define(["jquery", "qlik", "css!./devtool.css"],

	/**
	 * @owner Erik Wetterberg (ewg)
	 */
	function ($, qlik, csscontent) {
		$( '<link href="https://fonts.googleapis.com/icon?family=Material+Icons"rel="stylesheet">' ).appendTo( "head" );
		function toggleId () {
            
			var cnt = $( ".devtool-tooltip" ).remove();
            // build an array of States from the select options
            var stList = document.getElementById("cswStatesList");
            var i, stArr = ["$"];
            for (i = 1; i < stList.length; i++) {
                stArr.push(stList.options[i].text);
            }
            
            
			if ( cnt.length === 0 ) {
				$( '.qv-object' ).each( function ( i, el ) {
                    
                    var s = angular.element( el ).scope();
                    if ( s.$$childHead && s.$$childHead.layout ) {
                        var layout = s.$$childHead.layout;
                        var model = s.$$childHead.model;
                        if(layout.visualization != 'SetObjectState'){

                            var html = '<div class="devtool-tooltip">'
                            //if(layout.visualization != 'devtool'){ 
                            html +=	'<a class="devtool-btn" title="Pick object"><i class="small material-icons">done</i></a>'
                            //}
                            html +=	'<div>' + layout.qInfo.qId + '</div>';
                            html += '<div>' + layout.visualization;

                            if (layout.hasOwnProperty('qHyperCube')) {
                                if (layout.qHyperCube.hasOwnProperty('qStateName')) {  
                                    if (layout.qHyperCube.qStateName != '$') {   
                                        if(stArr.indexOf(layout.qHyperCube.qStateName) > 0) {
                                            html += '<br><span style="background-color:yellow;">State: ' 
                                        } else {
                                            html += '<br><span style="background-color:lightpink;">Missing State: ' 
                                        }
                                        html += layout.qHyperCube.qStateName + '</span>'; 
                                    }
                                }
                            } else 
                            if (layout.hasOwnProperty('qListObject')) {
                                if (layout.qListObject.hasOwnProperty('qStateName')) {  
                                    if (layout.qListObject.qStateName != '$') {   
                                        if(stArr.indexOf(layout.qListObject.qStateName) > 0) {
                                            html += '<br><span style="background-color:yellow;">State: ' 
                                        } else {
                                            html += '<br><span style="background-color:lightpink;">Missing State: ' 
                                        }
                                        html += layout.qListObject.qStateName + '</span>'; 
                                    }
                                }
                            }                             
                            html += '</div></div>';
                            $(el).append(html);
                            $(el).find('.devtool-btn' ).on('click',function(){
                                /*model.getProperties().then(function(reply){
                                    alert(JSON.stringify(reply,null,2));
                                });*/
                                document.getElementById("cswObjectId").value = layout.qInfo.qId;
                                  
                                toggleId();
                            });
                            //console.log(layout.qInfo.qId + ' has ListObject ' + layout.hasOwnProperty('qListObjectDef'));
                            //console.dir(layout.qHyperCube);
                        }
                    } else {
                        console.log( "No ID found" );
                    }

				});
			}
		}

		return {
			initialProperties: {
				version: 2.0,
				showTitles: false
			}, paint: function ( $element, layout ) {
                
                var self = this;
                var app = qlik.currApp(this);
                var ownId = this.options.id;   
                var html = '';
                 
				$(".devtool-btn").remove();
				$(document.body).append( "<button class='devtool-btn fab'><i class='material-icons'>settings</i></button>" );
				$(".devtool-btn").on( "click", toggleId );
                
                html += 'ObjectId '
                    + '<input type="text" id="cswObjectId" style="width:90px;" value="" />';
                html += '<button style="padding:0 8px 0 8px;" data-cmd="' + ownId + 'PickObject">Pick</button>&nbsp';
                html += '<a title="Pick an object and then choose a state into which you like to put it and click [Set]." class="material-icons">info</a>';
                html += '<br/>States ';
                html += '<select id="cswStatesList" '
                    + 'onchange="if(document.getElementById(\'cswStatesList\').value!=\'$\'){document.getElementById(\'' + ownId + 'EnterState\').value=document.getElementById(\'cswStatesList\').value}">';
                html += '<option value="$">Main State</option>';
                
                var getLayoutPromise = app.getAppLayout();   
                getLayoutPromise.then (function(layout){			 
                    $.each(layout.qStateNames, function(key, value) {						
                      
                        var selectList = document.getElementById("cswStatesList");
                        var option = document.createElement("option");
                        option.text = value;
                        option.value = value;
                        selectList.add(option);
                    });
                });
                
                html += '</select>';
                html += '<button style="padding:0 8px 0 8px;" data-cmd="' + ownId + 'SetState">Set</button>';
                html += '<hr/>State ';
                html += '<input type="text" id="' + ownId + 'EnterState" style="width:90px;" value="" />';
                html += '<button style="padding:0 8px 0 8px;" data-cmd="' + ownId + 'AddState">Add</button>';
                html += '<button style="padding:0 1px 0 1px;" data-cmd="' + ownId + 'DelState">Remove</button>&nbsp;';
                html += '<a title="Here you can add and remove Alternate States on app level." class="material-icons">info</a>'
                $element.html(html);
                
                
                $element.find('button').on('qv-activate', function() {
                    switch($(this).data('cmd')) {

                    case ownId + 'SetState':

						var objId = $element.find('#cswObjectId').val();
                        if (objId.length == 0) { 
                            alert('No ObjectId entered or picked.'); 
                            return; 
                        }
                        var stateName = $element.find('#cswStatesList').val();
                        var stateFootnote = '';
                        if (stateName != '$') {
                            stateFootnote += 'Alternate State: ' + stateName;
                        }
                         
// https://help.qlik.com/sense/2.1/en-US/developer/#../Subsystems/EngineAPI/Content/GenericObject/PropertyLevel/ListObjectDef.htm
                            
                        app.getObject(objId).then(function(object) 
                        {
                            if (object.layout.qInfo.qType === 'filterpane') {
                                // special procedure if the object is a filterpane, it consists of 1..n listboxes
                                if(layout.setFootnote) { 
                                    object.showTitles = true;
                                    object.layout.footnote = stateFootnote; 
                                }
                                console.log('Object ' + objId + ' is a filterpane. Looking for listboxes inside of it ...');
                                            
                                $.each(object.layout.qChildList.qItems, function(arrayKey,arrayVal){    
                                    objId = arrayVal.qInfo.qId;
                                    
                                    app.getObject(objId).then(function(childObject){
                                        console.log('Now patching object ' + objId 
                                            + ' which is of type "' + childObject.layout.qInfo.qType + '" to State "' + stateName + '"');
                                        //console.dir(childObject);

                                        var JSONpatch = JSON.parse(
                                        '{"qPath":"/qListObjectDef/qStateName", "qOp":"add", "qValue":"\\"' + stateName + '\\"" }'
                                        );
                                        
                                        childObject.applyPatches([JSONpatch], false);                                    
                                    })
                                    
                                })
                                
                            } else {
                                var patchPath = '';
                                if(object.layout.hasOwnProperty('qHyperCube')) { patchPath += '/qHyperCubeDef/qStateName'; }                
                                if(object.layout.hasOwnProperty('qListObject')) { patchPath += '/qListObjectDef/qStateName'; }                
                                if(patchPath == '') {
                                    alert('Object ' + objId + " cannot be patched, it's neither a List nor a HyperCube");
                                } else {
                                    console.log('Now patching object ' + objId 
                                        + ' type "' + object.layout.qInfo.qType 
                                        + '" to State "' + stateName + '" (' + patchPath + ')');
                                    //console.dir(object);

                                    var JSONpatch = JSON.parse(
                                    '{"qPath":"' + patchPath + '", "qOp":"add", "qValue":"\\"' + stateName + '\\"" }'
                                    );

                                    if(layout.setFootnote) { 
                                        object.showTitles = true;
                                        object.layout.footnote = stateFootnote; 
                                    }
                                    object.applyPatches([JSONpatch], false);
                                }
                            }
                        }); 
                            
                        app.doSave().then(function()
                        {
                            console.log('Object changed and app saved.');
				            self.paint($element, layout);
						});	  
                        break;   // end of case 'SetState'                         
                    
                    case ownId + 'AddState':
                        var stateName = $element.find('#' + ownId + 'EnterState').val();
                        if (stateName.length == 0) { 
                            alert('No State Name entered.'); 
                            return; 
                        } else {
                            app.addAlternateState(stateName);
                            app.doSave().then(function(){
                                console.log('State added and app saved.');
				                self.paint($element, layout);
				            });
                        }
                        break; // end of case 'AddState'   
                            
                    case ownId + 'DelState':
                        var stateName = $element.find('#' + ownId + 'EnterState').val();
                        if (stateName.length == 0) { 
                            alert('No State Name entered.'); 
                            return; 
                        } else {
                            app.removeAlternateState(stateName);
                            app.doSave().then(function(){
                                console.log('State removed and app saved.');
				                self.paint($element, layout);
				            });
                        }
                        break; // end of case 'AddState'   
                    
                    case ownId + 'PickObject':
                        //alert($(".devtool-tooltip").length);
                        if ($(".devtool-tooltip").length == 0) {
                            toggleId();
                        };    
                        
                        break;
                    } // end of switch
                })
			}
		};

	});
