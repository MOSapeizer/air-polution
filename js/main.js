var resize_canvas = function() {
  var canvas = $("canvas");
  canvas.width( window.innerWidth );
  canvas.height( window.innerHeight );
}

var opening_animation = function(){
	return setInterval(function(){
		if( images_index >= 20 ){
			$('#opening img').fadeOut(600);
			clearInterval(opening_id);
		}
		$("#opening img").attr("src", "images/opening/" + images_index + ".png");
		images_index += 1;
	}, 200);
}

opening_id = opening_animation();

$(document).ready(function(){
	width = $(".page").width();
	height = $(".page").height();
    var $window = $(window);
    var $animation_view = $('.content');
	var taiwan = d3.select("svg").append("g");
  	var info_box = d3.select("#info-box");
  	var dustTV = new DustAnimationControl(width, height);
	var mapCenter = [120, 24.5];
	
	var objectRange = function( obj ){
		var v = [];
		for( var key in obj ) v.push(obj[key]);
		return d3.extent(v);
	};

	var select_animation_type = function( position ){
		if( position >= 0 && position <= (height * 0.6) ){
			return "Float";
		}else if( position > (height * 0.6) && position <= 1.5 * height ){
			return "Circle";
		}else if( position > (height * 2.5) && position <= 3.5 * height ){
			return "Float";
		}else{
			console.log( position );
			return "Nothing";
		}
	};

	var check_in_view = function(){
		var window_height = $window.height();
		var window_top_position = $window.scrollTop();
		var window_bottom_position = (window_top_position + window_height);

		$.each($animation_view, function(){
			var $element = $(this);
			var element_half_height = $element.outerHeight() / 2;
		    var element_half_position = $element.offset().top + element_half_height;

		    if ( (element_half_position <= window_bottom_position) && (element_half_position >= window_top_position) ) {
		      $element.addClass('in-view');
		      var animation = $element.attr("animate");
		      var tween = dustTV.playing + "_To_" + animation;
		      dustTV.start( animation );
		    } else {
		      $element.removeClass('in-view');
		    }

		});
	}

	check_in_view();
	$(window).scroll( check_in_view );

	var purple_alert = ['#fff' ,'#505'];
	var color_range = ['#fef0d9' ,'#fdba57', '#fda38a', '#f24249', '#a7050e', '#760207'];
    var longChartSVG = d3.select('#long-chart')
    					 .append('g')
    					 .attr( 'transform', 'translate(' + width * 0.45 + ',' + height * 0.2 + ')');

    var object_range = objectRange( pm25 );
    var color = d3.scale.quantile().domain( object_range ).range( color_range );

    add_description_on_circle( dustTV.dustPanel.circle_position(0) );

    d3.csv("data/pm2.5/2015pm2.5年均值.csv", function(data){
    	var rectMaxWidth = width * 0.4;
    	var valueMax = object_range[1];
    	var scaleX = d3.scale.linear()
    						 .range([0, rectMaxWidth])
    						 .domain([0, 35]);
    	var axisX = d3.svg.axis().scale( scaleX ).orient("bottom").ticks(8);
    	var whoX = scaleX(10);
    	var taiwanX = scaleX(15);
    	var who_line = [{ x: whoX, y: 0 }, { x: whoX, y: 410}];
    	var taiwan_line = [{ x: taiwanX, y: 0 }, { x: taiwanX, y: 410}];
    	var draw_line = d3.svg.line().x(function(d){ return d.x })
    								.y(function(d){ return d.y });
    	var barGroup = longChartSVG.append("g").selectAll(".bar")
    			.data( data )
    			.enter();

    	barGroup.append("rect")
    			.attr("class", "bar")
    			.attr("x", 0)
    			.attr("y", function(d, i){ return i * 20; })
    			.attr("fill", function(d){ return color(d.pm) })
    			.attr("width", function(d){ return d.pm / 35 * rectMaxWidth ; })
    			.attr("height", 15);

    	barGroup.append("text")
    			.attr("x", -54)
    			.attr("y", function(d, i){ return i * 20; })
    			.attr("dy", "0.75em")
    			.text(function(d){ return d.city; });

    	longChartSVG.append("g")
    			.call(axisX)
    			.attr({
    				'fill': 'none',
    				'stroke': '#000',
    				'transform': 'translate(0, 410)'
    			});

    	longChartSVG.append("path")
    			.attr({
    				'd': draw_line(who_line),
    				'y': 0,
    				'stroke': '#F00',
    				'stroke-width': '5px',
    				'fill': 'red'
    			});

        longChartSVG.append("text")
                .attr({
                    'x': whoX -30,
                    'y': -6,
                }).text("WHO標準");

        longChartSVG.append("text")
                .attr({
                    'x': taiwanX - 30,
                    'y': -6,
                }).text("台灣標準");

    	longChartSVG.append("path")
    			.attr({
    				'd': draw_line(taiwan_line),
    				'y': 0,
    				'stroke': '#F00',
    				'stroke-width': '5px',
    				'fill': 'red'
    			});

    })

	d3.json("data/county.json", function(topodata) {
		var features = topojson.feature(topodata, topodata.objects["County_MOI_1041215"]).features;
		
		// var color = d3.scale.quantize().domain( object_range ).range( color_range );
		var fisheye = d3.fisheye.circular().radius(100).distortion(2);
		var prj = function(v){
			 var ret = d3.geo.mercator().center( mapCenter ).scale(8000)(v);
			 var ret = fisheye({ x:ret[0], y:ret[1] });
			 return [ret.x, ret.y];
		};
		var path = d3.geo.path().projection( prj );

		for( var index = features.length - 1 ; index >= 0 ; index-- ){
			City = features[index].properties.C_Name;
			features[index].concentration = pm25[City];
		}

		taiwan.selectAll("path").data( features ).enter().append("path");

		var update = function(){
			taiwan.selectAll("path").attr({ "d": path,
				"fill": function(d){ return color( d.concentration ); }
			}).on("mouseover", function(d){ 
				info_box.select("h3").text(d.properties.C_Name);
				info_box.select("p").text(d.concentration + " μg/m3");
				d3.select(this).attr({ "stroke": "white", "stroke-width": "4" });
			}).on("mouseleave", function(d){
				d3.select(this).attr("stroke", "none");
			});
		}

		update();

	});

    var type = function(d){
        d && (d.year = d.year + "年");
        return d;
    }

	d3.csv("data/pm2.5/手自動監測.csv", type, function(data){
    	var lineChartWidth = width * 0.45;
    	var lineChartHeight = height * 0.2;
		var lineChartSVG = d3.select('#line-chart').append('g')
    						 .attr( 'transform', 'translate(' + width * 0.4 + ',' + lineChartHeight + ')');
    	var domain_x = data.map(function(d){ return d.year; });
        console.log(domain_x);
    	var text_offset = lineChartWidth / (data.length-1)  / 2;
		var chart_height = height * 0.3;
		var scaleX = d3.scale.ordinal()
    						 .rangePoints([0, lineChartWidth])
    						 .domain(domain_x);
    	var scaleY = d3.scale.linear()
    						 .range([chart_height, 0])
    						 .domain([20, 40]);
    	var axisX = d3.svg.axis().scale( scaleX ).orient("bottom");
    	var axisY = d3.svg.axis().scale( scaleY ).orient("left").ticks(5);

    	var line = d3.svg.line().x(function(d){ return scaleX(d.year) })
    							.y(function(d){ return scaleY(d.auto) });
    	lineChartSVG.append("g")
    				.call(axisY)
    				.attr("class", "axis")
    				.append("text")
    				.attr("transform", "rotate(-90)")
    				.attr("y", 0)
    				.attr("x", -chart_height / 2)
    				.attr("dy", "-2em")
    				.text("μg/m3");

    	lineChartSVG.append("g")
    				.call(axisX)
    				.attr("class", "x axis")
    				.attr('transform', 'translate(0, ' + chart_height + ')')
    				.selectAll("text")
    				.attr("transform", 'translate(' + text_offset + ', 0)')

    	var line_group = lineChartSVG.append("g");

    	line_group.append("path")
    				.datum(data)
    				.attr("class", "line")
    				.attr("d", line)
    				.attr("transform", 'translate(' + text_offset + ', 0)');

    	var text_description_offset = (scaleX(domain_x[domain_x.length -1]) + text_offset);

    	line_group.append("text")
    				.attr("transform", 'translate(' + text_description_offset + ', ' + scaleY(30) + ')')
    				.text("自動偵測");

    	line_group.append("text")
    				.attr("transform", 'translate(' + (text_description_offset + 10) + ', ' + scaleY(23.5) + ')')
    				.text("手動偵測");

    	line_group.append("circle")
    			  .attr("r", 5)
    			  .attr("cx", text_description_offset)
    			  .attr("cy", scaleY(23.5))
    			  .attr("class", "manual-point");
	});


    var formatDate = d3.time.format("%Y-%m-%d");

    var time_filter = function(obj){
       obj.PublishTime = obj.PublishTime.split(" ")[0];
       obj.PM = +obj.PM;
       return obj;
    }

    var countify = function(elem){
        if( this[elem.County] == undefined )
            this[elem.County] = [elem];
        else
            this[elem.County].push(elem);
    }

    var weekify = function(elem){
        if( this[elem.PublishTime] == undefined )
            this[elem.PublishTime] = { total: 1, data: elem.PM };
        else{
            this[elem.PublishTime].data += elem.PM;
            this[elem.PublishTime].total += 1;
        }
    }

    var time_sort = function(x, y){
        return d3.ascending(x.PublishTime, y.PublishTime);
    }

    d3.json("data/2014-filter.json", function(data){
        var county = {};
        test_data = data.map( time_filter );
        test_data.forEach(countify.bind(county));
        var five_zone = {};
        var offset_x = width * 0.4;
        var offset_y = height * 0.2;
        for( var c in county ){
            var c_daily_buff = {};
            var c_daily_data = [];
            county[c].forEach(weekify.bind(c_daily_buff));
            for( var property in c_daily_buff ){
                c_daily_data.push({ PublishTime: formatDate.parse(property), PM: (c_daily_buff[property].data / c_daily_buff[property].total) });
            }
            five_zone[c] = c_daily_data;
        }
        var lineChartWidth = width * 0.45;
        var lineChartHeight = height * 0.5;
        var lineChartSVG = d3.select('#compare-chart').append('g');

        var x = d3.time.scale()
            .domain([new Date(2014, 1, 1), new Date(2014, 11, 31)])
            .range([0, lineChartWidth]);

        var y = d3.scale.linear()
            .domain([0, 100])
            .range([400, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.months)
            .tickFormat( d3.time.format("%b") );

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function(d) { return x(d.PublishTime); })
            .y(function(d) { return y(d.PM); });

        lineChartSVG.append("g")
            .attr( "class", "x axis" )
            .attr( 'transform', 'translate(' + offset_x + ',' + 650 + ')')
            .call( xAxis );

        lineChartSVG.append("g")
            .attr("class", "y axis")
            .attr( 'transform', 'translate(' + offset_x + ',' + 250 + ')')
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("PM");

        var c10 = d3.scale.category10();
        var index = 0;
        for( var county in five_zone ){
            var daily_county = five_zone[county];
            var week_county = data_group_by_week( daily_county ).sort(time_sort);
            draw_line( county ,week_county, c10(index++));   
        }

        function data_group_by_week(data) {
            var week = d3.time.format("%U");
            var nest = d3.nest().key(function (d) { return week(new Date(d.PublishTime));})
                                .sortKeys(d3.ascending)
                                .entries(data);
            var group = nest.map(average_week_data);
            return group;
        }

        function average_week_data(object){
            var value = 0;
            object.values.forEach(function(v){
                value += v.PM;
            });
            return { PM: value / object.values.length
                   , PublishTime: object.values[0].PublishTime }
        }
        
        function draw_line( label, data, color ){
            var text_x =  x(data[data.length -1].PublishTime);
            var text_y =  y(data[data.length -1].PM);

            lineChartSVG.append( "path" )
            .attr( 'transform', 'translate(' + width * 0.4 + ',' + 275 + ')')
            .datum( data )
            .attr( "class", "line" )
            .attr( "d", line )
            .attr( "stroke", color );

            lineChartSVG.append("text")
            .attr("transform", "translate(" + (width * 0.4 + 3 + text_x) + "," + (text_y + 275) + ")")
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .style("fill", color)
            .text(label);
        }

    });
});


