/* =========================================================
 * bootstrap-datepicker.js
 * http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Copyright 2012 Stefan Petre
 * Improvements by Andrew Rowls
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function( $ ) {

	var $window = $(window);

	function UTCDate(){
		return new Date(Date.UTC.apply(Date, arguments));
	}
	function UTCToday(){
		var today = new Date();
		return UTCDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	}


	// Picker object

	var Datepicker = function(element, options) {
		var that = this;

		this._process_options(options);

		this.element = $(element);
		this.isInline = false;
		this.isInput = this.element.is('input');
		this.component = this.element.is('.date') ? this.element.find('.add-on, .btn') : false;
		this.hasInput = this.component && this.element.find('input').length;
		if(this.component && this.component.length === 0)
			this.component = false;

		this.picker = $(DPGlobal.template);
		this._buildEvents();
		this._attachEvents();

		if(this.isInline) {
			this.picker.addClass('datepicker-inline').appendTo(this.element);
		} else {
			this.picker.addClass('datepicker-dropdown dropdown-menu');
		}

		if (this.o.rtl){
			this.picker.addClass('datepicker-rtl');
			this.picker.find('.prev i, .next i')
						.toggleClass('icon-arrow-left icon-arrow-right');
		}


		this.viewMode = this.o.startView;

		if (this.o.calendarWeeks)
			this.picker.find('tfoot th.today')
						.attr('colspan', function(i, val){
							return parseInt(val) + 1;
						});

		this._allow_update = false;

		this.setStartDate(this._o.startDate);
		this.setEndDate(this._o.endDate);
		this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);

		this.fillDow();
		this.fillMonths();

		this._allow_update = true;

		this.update();
		this.showMode();

		if(this.isInline) {
			this.show();
		}
	};

	Datepicker.prototype = {
		constructor: Datepicker,

		_process_options: function(opts){
			// Store raw options for reference
			this._o = $.extend({}, this._o, opts);
			// Processed options
			var o = this.o = $.extend({}, this._o);

			// Check if "de-DE" style date is available, if not language should
			// fallback to 2 letter code eg "de"
			var lang = o.language;
			if (!dates[lang]) {
				lang = lang.split('-')[0];
				if (!dates[lang])
					lang = defaults.language;
			}
			o.language = lang;

			switch(o.startView){
				case 2:
				case 'decade':
					o.startView = 2;
					break;
				case 1:
				case 'year':
					o.startView = 1;
					break;
				default:
					o.startView = 0;
			}

			switch (o.minViewMode) {
				case 1:
				case 'months':
					o.minViewMode = 1;
					break;
				case 2:
				case 'years':
					o.minViewMode = 2;
					break;
				default:
					o.minViewMode = 0;
			}

			o.startView = Math.max(o.startView, o.minViewMode);

			o.weekStart %= 7;
			o.weekEnd = ((o.weekStart + 6) % 7);

			var format = DPGlobal.parseFormat(o.format);
			if (o.startDate !== -Infinity) {
				if (!!o.startDate) {
					if (o.startDate instanceof Date)
						o.startDate = this._local_to_utc(this._zero_time(o.startDate));
					else
						o.startDate = DPGlobal.parseDate(o.startDate, format, o.language);
				} else {
					o.startDate = -Infinity;
				}
			}
			if (o.endDate !== Infinity) {
				if (!!o.endDate) {
					if (o.endDate instanceof Date)
						o.endDate = this._local_to_utc(this._zero_time(o.endDate));
					else
						o.endDate = DPGlobal.parseDate(o.endDate, format, o.language);
				} else {
					o.endDate = Infinity;
				}
			}

			o.daysOfWeekDisabled = o.daysOfWeekDisabled||[];
			if (!$.isArray(o.daysOfWeekDisabled))
				o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
			o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function (d) {
				return parseInt(d, 10);
			});

			var plc = String(o.orientation).toLowerCase().split(/\s+/g),
				_plc = o.orientation.toLowerCase();
			plc = $.grep(plc, function(word){
				return (/^auto|left|right|top|bottom$/).test(word);
			});
			o.orientation = {x: 'auto', y: 'auto'};
			if (!_plc || _plc === 'auto')
				; // no action
			else if (plc.length === 1){
				switch(plc[0]){
					case 'top':
					case 'bottom':
						o.orientation.y = plc[0];
						break;
					case 'left':
					case 'right':
						o.orientation.x = plc[0];
						break;
				}
			}
			else {
				_plc = $.grep(plc, function(word){
					return (/^left|right$/).test(word);
				});
				o.orientation.x = _plc[0] || 'auto';

				_plc = $.grep(plc, function(word){
					return (/^top|bottom$/).test(word);
				});
				o.orientation.y = _plc[0] || 'auto';
			}
		},
		_events: [],
		_secondaryEvents: [],
		_applyEvents: function(evs){
			for (var i=0, el, ev; i<evs.length; i++){
				el = evs[i][0];
				ev = evs[i][1];
				el.on(ev);
			}
		},
		_unapplyEvents: function(evs){
			for (var i=0, el, ev; i<evs.length; i++){
				el = evs[i][0];
				ev = evs[i][1];
				el.off(ev);
			}
		},
		_buildEvents: function(){
			if (this.isInput) { // single input
				this._events = [
					[this.element, {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(this.update, this),
						keydown: $.proxy(this.keydown, this)
					}]
				];
			}
			else if (this.component && this.hasInput){ // component: input + button
				this._events = [
					// For components that are not readonly, allow keyboard nav
					[this.element.find('input'), {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(this.update, this),
						keydown: $.proxy(this.keydown, this)
					}],
					[this.component, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			else if (this.element.is('div')) {  // inline datepicker
				this.isInline = true;
			}
			else {
				this._events = [
					[this.element, {
						click: $.proxy(this.show, this)
					}]
				];
			}

			this._secondaryEvents = [
				[this.picker, {
					click: $.proxy(this.click, this)
				}],
				[$(window), {
					resize: $.proxy(this.place, this)
				}],
				[$(document), {
					mousedown: $.proxy(function (e) {
						// Clicked outside the datepicker, hide it
						if (!(
							this.element.is(e.target) ||
							this.element.find(e.target).length ||
							this.picker.is(e.target) ||
							this.picker.find(e.target).length
						)) {
							this.hide();
						}
					}, this)
				}]
			];
		},
		_attachEvents: function(){
			this._detachEvents();
			this._applyEvents(this._events);
		},
		_detachEvents: function(){
			this._unapplyEvents(this._events);
		},
		_attachSecondaryEvents: function(){
			this._detachSecondaryEvents();
			this._applyEvents(this._secondaryEvents);
		},
		_detachSecondaryEvents: function(){
			this._unapplyEvents(this._secondaryEvents);
		},
		_trigger: function(event, altdate){
			var date = altdate || this.date,
				local_date = this._utc_to_local(date);

			this.element.trigger({
				type: event,
				date: local_date,
				format: $.proxy(function(altformat){
					var format = altformat || this.o.format;
					return DPGlobal.formatDate(date, format, this.o.language);
				}, this)
			});
		},

		show: function(e) {
			if (!this.isInline)
				this.picker.appendTo('body');
			this.picker.show();
			this.height = this.component ? this.component.outerHeight() : this.element.outerHeight();
			this.place();
			this._attachSecondaryEvents();
			if (e) {
				e.preventDefault();
			}
			this._trigger('show');
		},

		hide: function(e){
			if(this.isInline) return;
			if (!this.picker.is(':visible')) return;
			this.picker.hide().detach();
			this._detachSecondaryEvents();
			this.viewMode = this.o.startView;
			this.showMode();

			if (
				this.o.forceParse &&
				(
					this.isInput && this.element.val() ||
					this.hasInput && this.element.find('input').val()
				)
			)
				this.setValue();
			this._trigger('hide');
		},

		remove: function() {
			this.hide();
			this._detachEvents();
			this._detachSecondaryEvents();
			this.picker.remove();
			delete this.element.data().datepicker;
			if (!this.isInput) {
				delete this.element.data().date;
			}
		},

		_utc_to_local: function(utc){
			return new Date(utc.getTime() + (utc.getTimezoneOffset()*60000));
		},
		_local_to_utc: function(local){
			return new Date(local.getTime() - (local.getTimezoneOffset()*60000));
		},
		_zero_time: function(local){
			return new Date(local.getFullYear(), local.getMonth(), local.getDate());
		},
		_zero_utc_time: function(utc){
			return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
		},

		getDate: function() {
			return this._utc_to_local(this.getUTCDate());
		},

		getUTCDate: function() {
			return this.date;
		},

		setDate: function(d) {
			this.setUTCDate(this._local_to_utc(d));
		},

		setUTCDate: function(d) {
			this.date = d;
			this.setValue();
		},

		setValue: function() {
			var formatted = this.getFormattedDate();
			if (!this.isInput) {
				if (this.component){
					this.element.find('input').val(formatted).change();
				}
			} else {
				this.element.val(formatted).change();
			}
		},

		getFormattedDate: function(format) {
			if (format === undefined)
				format = this.o.format;
			return DPGlobal.formatDate(this.date, format, this.o.language);
		},

		setStartDate: function(startDate){
			this._process_options({startDate: startDate});
			this.update();
			this.updateNavArrows();
		},

		setEndDate: function(endDate){
			this._process_options({endDate: endDate});
			this.update();
			this.updateNavArrows();
		},

		setDaysOfWeekDisabled: function(daysOfWeekDisabled){
			this._process_options({daysOfWeekDisabled: daysOfWeekDisabled});
			this.update();
			this.updateNavArrows();
		},

		place: function(){
						if(this.isInline) return;
			var calendarWidth = this.picker.outerWidth(),
				calendarHeight = this.picker.outerHeight(),
				visualPadding = 10,
				windowWidth = $window.width(),
				windowHeight = $window.height(),
				scrollTop = $window.scrollTop();

			var zIndex = parseInt(this.element.parents().filter(function() {
							return $(this).css('z-index') != 'auto';
						}).first().css('z-index'))+10;
			var offset = this.component ? this.component.parent().offset() : this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
			var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
			var left = offset.left,
				top = offset.top;

			this.picker.removeClass(
				'datepicker-orient-top datepicker-orient-bottom '+
				'datepicker-orient-right datepicker-orient-left'
			);

			if (this.o.orientation.x !== 'auto') {
				this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
				if (this.o.orientation.x === 'right')
					left -= calendarWidth - width;
			}
			// auto x orientation is best-placement: if it crosses a window
			// edge, fudge it sideways
			else {
				// Default to left
				this.picker.addClass('datepicker-orient-left');
				if (offset.left < 0)
					left -= offset.left - visualPadding;
				else if (offset.left + calendarWidth > windowWidth)
					left = windowWidth - calendarWidth - visualPadding;
			}

			// auto y orientation is best-situation: top or bottom, no fudging,
			// decision based on which shows more of the calendar
			var yorient = this.o.orientation.y,
				top_overflow, bottom_overflow;
			if (yorient === 'auto') {
				top_overflow = -scrollTop + offset.top - calendarHeight;
				bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
				if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
					yorient = 'top';
				else
					yorient = 'bottom';
			}
			this.picker.addClass('datepicker-orient-' + yorient);
			if (yorient === 'top')
				top += height;
			else
				top -= calendarHeight + parseInt(this.picker.css('padding-top'));

			this.picker.css({
				top: top,
				left: left,
				zIndex: zIndex
			});
		},

		_allow_update: true,
		update: function(){
			if (!this._allow_update) return;

			var oldDate = new Date(this.date),
				date, fromArgs = false;
			if(arguments && arguments.length && (typeof arguments[0] === 'string' || arguments[0] instanceof Date)) {
				date = arguments[0];
				if (date instanceof Date)
					date = this._local_to_utc(date);
				fromArgs = true;
			} else {
				date = this.isInput ? this.element.val() : this.element.data('date') || this.element.find('input').val();
				delete this.element.data().date;
			}

			this.date = DPGlobal.parseDate(date, this.o.format, this.o.language);

			if (fromArgs) {
				// setting date by clicking
				this.setValue();
			} else if (date) {
				// setting date by typing
				if (oldDate.getTime() !== this.date.getTime())
					this._trigger('changeDate');
			} else {
				// clearing date
				this._trigger('clearDate');
			}

			if (this.date < this.o.startDate) {
				this.viewDate = new Date(this.o.startDate);
				this.date = new Date(this.o.startDate);
			} else if (this.date > this.o.endDate) {
				this.viewDate = new Date(this.o.endDate);
				this.date = new Date(this.o.endDate);
			} else {
				this.viewDate = new Date(this.date);
				this.date = new Date(this.date);
			}
			this.fill();
		},

		fillDow: function(){
			var dowCnt = this.o.weekStart,
			html = '<tr>';
			if(this.o.calendarWeeks){
				var cell = '<th class="cw">&nbsp;</th>';
				html += cell;
				this.picker.find('.datepicker-days thead tr:first-child').prepend(cell);
			}
			while (dowCnt < this.o.weekStart + 7) {
				html += '<th class="dow">'+dates[this.o.language].daysMin[(dowCnt++)%7]+'</th>';
			}
			html += '</tr>';
			this.picker.find('.datepicker-days thead').append(html);
		},

		fillMonths: function(){
			var html = '',
			i = 0;
			while (i < 12) {
				html += '<span class="month">'+dates[this.o.language].monthsShort[i++]+'</span>';
			}
			this.picker.find('.datepicker-months td').html(html);
		},

		setRange: function(range){
			if (!range || !range.length)
				delete this.range;
			else
				this.range = $.map(range, function(d){ return d.valueOf(); });
			this.fill();
		},

		getClassNames: function(date){
			var cls = [],
				year = this.viewDate.getUTCFullYear(),
				month = this.viewDate.getUTCMonth(),
				currentDate = this.date.valueOf(),
				today = new Date();
			if (date.getUTCFullYear() < year || (date.getUTCFullYear() == year && date.getUTCMonth() < month)) {
				cls.push('old');
			} else if (date.getUTCFullYear() > year || (date.getUTCFullYear() == year && date.getUTCMonth() > month)) {
				cls.push('new');
			}
			// Compare internal UTC date with local today, not UTC today
			if (this.o.todayHighlight &&
				date.getUTCFullYear() == today.getFullYear() &&
				date.getUTCMonth() == today.getMonth() &&
				date.getUTCDate() == today.getDate()) {
				cls.push('today');
			}
			if (currentDate && date.valueOf() == currentDate) {
				cls.push('active');
			}
			if (date.valueOf() < this.o.startDate || date.valueOf() > this.o.endDate ||
				$.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1) {
				cls.push('disabled');
			}
			if (this.range){
				if (date > this.range[0] && date < this.range[this.range.length-1]){
					cls.push('range');
				}
				if ($.inArray(date.valueOf(), this.range) != -1){
					cls.push('selected');
				}
			}
			return cls;
		},

		fill: function() {
			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth(),
				startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
				endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
				endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
				currentDate = this.date && this.date.valueOf(),
				tooltip;
			this.picker.find('.datepicker-days thead th.datepicker-switch')
						.text(dates[this.o.language].months[month]+' '+year);
			this.picker.find('tfoot th.today')
						.text(dates[this.o.language].today)
						.toggle(this.o.todayBtn !== false);
			this.picker.find('tfoot th.clear')
						.text(dates[this.o.language].clear)
						.toggle(this.o.clearBtn !== false);
			this.updateNavArrows();
			this.fillMonths();
			var prevMonth = UTCDate(year, month-1, 28,0,0,0,0),
				day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
			prevMonth.setUTCDate(day);
			prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7)%7);
			var nextMonth = new Date(prevMonth);
			nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
			nextMonth = nextMonth.valueOf();
			var html = [];
			var clsName;
			while(prevMonth.valueOf() < nextMonth) {
				if (prevMonth.getUTCDay() == this.o.weekStart) {
					html.push('<tr>');
					if(this.o.calendarWeeks){
						// ISO 8601: First week contains first thursday.
						// ISO also states week starts on Monday, but we can be more abstract here.
						var
							// Start of current week: based on weekstart/current date
							ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
							// Thursday of this week
							th = new Date(+ws + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
							// First Thursday of year, year from thursday
							yth = new Date(+(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay())%7*864e5),
							// Calendar week: ms between thursdays, div ms per day, div 7 days
							calWeek =  (th - yth) / 864e5 / 7 + 1;
						html.push('<td class="cw">'+ calWeek +'</td>');

					}
				}
				clsName = this.getClassNames(prevMonth);
				clsName.push('day');

				if (this.o.beforeShowDay !== $.noop){
					var before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
					if (before === undefined)
						before = {};
					else if (typeof(before) === 'boolean')
						before = {enabled: before};
					else if (typeof(before) === 'string')
						before = {classes: before};
					if (before.enabled === false)
						clsName.push('disabled');
					if (before.classes)
						clsName = clsName.concat(before.classes.split(/\s+/));
					if (before.tooltip)
						tooltip = before.tooltip;
				}

				clsName = $.unique(clsName);
				html.push('<td class="'+clsName.join(' ')+'"' + (tooltip ? ' title="'+tooltip+'"' : '') + '>'+prevMonth.getUTCDate() + '</td>');
				if (prevMonth.getUTCDay() == this.o.weekEnd) {
					html.push('</tr>');
				}
				prevMonth.setUTCDate(prevMonth.getUTCDate()+1);
			}
			this.picker.find('.datepicker-days tbody').empty().append(html.join(''));
			var currentYear = this.date && this.date.getUTCFullYear();

			var months = this.picker.find('.datepicker-months')
						.find('th:eq(1)')
							.text(year)
							.end()
						.find('span').removeClass('active');
			if (currentYear && currentYear == year) {
				months.eq(this.date.getUTCMonth()).addClass('active');
			}
			if (year < startYear || year > endYear) {
				months.addClass('disabled');
			}
			if (year == startYear) {
				months.slice(0, startMonth).addClass('disabled');
			}
			if (year == endYear) {
				months.slice(endMonth+1).addClass('disabled');
			}

			html = '';
			year = parseInt(year/10, 10) * 10;
			var yearCont = this.picker.find('.datepicker-years')
								.find('th:eq(1)')
									.text(year + '-' + (year + 9))
									.end()
								.find('td');
			year -= 1;
			for (var i = -1; i < 11; i++) {
				html += '<span class="year'+(i == -1 ? ' old' : i == 10 ? ' new' : '')+(currentYear == year ? ' active' : '')+(year < startYear || year > endYear ? ' disabled' : '')+'">'+year+'</span>';
				year += 1;
			}
			yearCont.html(html);
		},

		updateNavArrows: function() {
			if (!this._allow_update) return;

			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth();
			switch (this.viewMode) {
				case 0:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()) {
						this.picker.find('.prev').css({visibility: 'hidden'});
					} else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()) {
						this.picker.find('.next').css({visibility: 'hidden'});
					} else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
				case 1:
				case 2:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear()) {
						this.picker.find('.prev').css({visibility: 'hidden'});
					} else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear()) {
						this.picker.find('.next').css({visibility: 'hidden'});
					} else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
			}
		},

		click: function(e) {
			e.preventDefault();
			var target = $(e.target).closest('span, td, th');
			if (target.length == 1) {
				switch(target[0].nodeName.toLowerCase()) {
					case 'th':
						switch(target[0].className) {
							case 'datepicker-switch':
								this.showMode(1);
								break;
							case 'prev':
							case 'next':
								var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className == 'prev' ? -1 : 1);
								switch(this.viewMode){
									case 0:
										this.viewDate = this.moveMonth(this.viewDate, dir);
										this._trigger('changeMonth', this.viewDate);
										break;
									case 1:
									case 2:
										this.viewDate = this.moveYear(this.viewDate, dir);
										if (this.viewMode === 1)
											this._trigger('changeYear', this.viewDate);
										break;
								}
								this.fill();
								break;
							case 'today':
								var date = new Date();
								date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

								this.showMode(-2);
								var which = this.o.todayBtn == 'linked' ? null : 'view';
								this._setDate(date, which);
								break;
							case 'clear':
								var element;
								if (this.isInput)
									element = this.element;
								else if (this.component)
									element = this.element.find('input');
								if (element)
									element.val("").change();
								this._trigger('changeDate');
								this.update();
								if (this.o.autoclose)
									this.hide();
								break;
						}
						break;
					case 'span':
						if (!target.is('.disabled')) {
							this.viewDate.setUTCDate(1);
							if (target.is('.month')) {
								var day = 1;
								var month = target.parent().find('span').index(target);
								var year = this.viewDate.getUTCFullYear();
								this.viewDate.setUTCMonth(month);
								this._trigger('changeMonth', this.viewDate);
								if (this.o.minViewMode === 1) {
									this._setDate(UTCDate(year, month, day,0,0,0,0));
								}
							} else {
								var year = parseInt(target.text(), 10)||0;
								var day = 1;
								var month = 0;
								this.viewDate.setUTCFullYear(year);
								this._trigger('changeYear', this.viewDate);
								if (this.o.minViewMode === 2) {
									this._setDate(UTCDate(year, month, day,0,0,0,0));
								}
							}
							this.showMode(-1);
							this.fill();
						}
						break;
					case 'td':
						if (target.is('.day') && !target.is('.disabled')){
							var day = parseInt(target.text(), 10)||1;
							var year = this.viewDate.getUTCFullYear(),
								month = this.viewDate.getUTCMonth();
							if (target.is('.old')) {
								if (month === 0) {
									month = 11;
									year -= 1;
								} else {
									month -= 1;
								}
							} else if (target.is('.new')) {
								if (month == 11) {
									month = 0;
									year += 1;
								} else {
									month += 1;
								}
							}
							this._setDate(UTCDate(year, month, day,0,0,0,0));
						}
						break;
				}
			}
		},

		_setDate: function(date, which){
			if (!which || which == 'date')
				this.date = new Date(date);
			if (!which || which  == 'view')
				this.viewDate = new Date(date);
			this.fill();
			this.setValue();
			this._trigger('changeDate');
			var element;
			if (this.isInput) {
				element = this.element;
			} else if (this.component){
				element = this.element.find('input');
			}
			if (element) {
				element.change();
			}
			if (this.o.autoclose && (!which || which == 'date')) {
				this.hide();
			}
		},

		moveMonth: function(date, dir){
			if (!dir) return date;
			var new_date = new Date(date.valueOf()),
				day = new_date.getUTCDate(),
				month = new_date.getUTCMonth(),
				mag = Math.abs(dir),
				new_month, test;
			dir = dir > 0 ? 1 : -1;
			if (mag == 1){
				test = dir == -1
					// If going back one month, make sure month is not current month
					// (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
					? function(){ return new_date.getUTCMonth() == month; }
					// If going forward one month, make sure month is as expected
					// (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
					: function(){ return new_date.getUTCMonth() != new_month; };
				new_month = month + dir;
				new_date.setUTCMonth(new_month);
				// Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
				if (new_month < 0 || new_month > 11)
					new_month = (new_month + 12) % 12;
			} else {
				// For magnitudes >1, move one month at a time...
				for (var i=0; i<mag; i++)
					// ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
					new_date = this.moveMonth(new_date, dir);
				// ...then reset the day, keeping it in the new month
				new_month = new_date.getUTCMonth();
				new_date.setUTCDate(day);
				test = function(){ return new_month != new_date.getUTCMonth(); };
			}
			// Common date-resetting loop -- if date is beyond end of month, make it
			// end of month
			while (test()){
				new_date.setUTCDate(--day);
				new_date.setUTCMonth(new_month);
			}
			return new_date;
		},

		moveYear: function(date, dir){
			return this.moveMonth(date, dir*12);
		},

		dateWithinRange: function(date){
			return date >= this.o.startDate && date <= this.o.endDate;
		},

		keydown: function(e){
			if (this.picker.is(':not(:visible)')){
				if (e.keyCode == 27) // allow escape to hide and re-show picker
					this.show();
				return;
			}
			var dateChanged = false,
				dir, day, month,
				newDate, newViewDate;
			switch(e.keyCode){
				case 27: // escape
					this.hide();
					e.preventDefault();
					break;
				case 37: // left
				case 39: // right
					if (!this.o.keyboardNavigation) break;
					dir = e.keyCode == 37 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.date, dir);
						newViewDate = this.moveYear(this.viewDate, dir);
						this._trigger('changeYear', this.viewDate);
					} else if (e.shiftKey){
						newDate = this.moveMonth(this.date, dir);
						newViewDate = this.moveMonth(this.viewDate, dir);
						this._trigger('changeMonth', this.viewDate);
					} else {
						newDate = new Date(this.date);
						newDate.setUTCDate(this.date.getUTCDate() + dir);
						newViewDate = new Date(this.viewDate);
						newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir);
					}
					if (this.dateWithinRange(newDate)){
						this.date = newDate;
						this.viewDate = newViewDate;
						this.setValue();
						this.update();
						e.preventDefault();
						dateChanged = true;
					}
					break;
				case 38: // up
				case 40: // down
					if (!this.o.keyboardNavigation) break;
					dir = e.keyCode == 38 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.date, dir);
						newViewDate = this.moveYear(this.viewDate, dir);
						this._trigger('changeYear', this.viewDate);
					} else if (e.shiftKey){
						newDate = this.moveMonth(this.date, dir);
						newViewDate = this.moveMonth(this.viewDate, dir);
						this._trigger('changeMonth', this.viewDate);
					} else {
						newDate = new Date(this.date);
						newDate.setUTCDate(this.date.getUTCDate() + dir * 7);
						newViewDate = new Date(this.viewDate);
						newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir * 7);
					}
					if (this.dateWithinRange(newDate)){
						this.date = newDate;
						this.viewDate = newViewDate;
						this.setValue();
						this.update();
						e.preventDefault();
						dateChanged = true;
					}
					break;
				case 13: // enter
					this.hide();
					e.preventDefault();
					break;
				case 9: // tab
					this.hide();
					break;
			}
			if (dateChanged){
				this._trigger('changeDate');
				var element;
				if (this.isInput) {
					element = this.element;
				} else if (this.component){
					element = this.element.find('input');
				}
				if (element) {
					element.change();
				}
			}
		},

		showMode: function(dir) {
			if (dir) {
				this.viewMode = Math.max(this.o.minViewMode, Math.min(2, this.viewMode + dir));
			}
			/*
				vitalets: fixing bug of very special conditions:
				jquery 1.7.1 + webkit + show inline datepicker in bootstrap popover.
				Method show() does not set display css correctly and datepicker is not shown.
				Changed to .css('display', 'block') solve the problem.
				See https://github.com/vitalets/x-editable/issues/37

				In jquery 1.7.2+ everything works fine.
			*/
			//this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).show();
			this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).css('display', 'block');
			this.updateNavArrows();
		}
	};

	var DateRangePicker = function(element, options){
		this.element = $(element);
		this.inputs = $.map(options.inputs, function(i){ return i.jquery ? i[0] : i; });
		delete options.inputs;

		$(this.inputs)
			.datepicker(options)
			.bind('changeDate', $.proxy(this.dateUpdated, this));

		this.pickers = $.map(this.inputs, function(i){ return $(i).data('datepicker'); });
		this.updateDates();
	};
	DateRangePicker.prototype = {
		updateDates: function(){
			this.dates = $.map(this.pickers, function(i){ return i.date; });
			this.updateRanges();
		},
		updateRanges: function(){
			var range = $.map(this.dates, function(d){ return d.valueOf(); });
			$.each(this.pickers, function(i, p){
				p.setRange(range);
			});
		},
		dateUpdated: function(e){
			var dp = $(e.target).data('datepicker'),
				new_date = dp.getUTCDate(),
				i = $.inArray(e.target, this.inputs),
				l = this.inputs.length;
			if (i == -1) return;

			if (new_date < this.dates[i]){
				// Date being moved earlier/left
				while (i>=0 && new_date < this.dates[i]){
					this.pickers[i--].setUTCDate(new_date);
				}
			}
			else if (new_date > this.dates[i]){
				// Date being moved later/right
				while (i<l && new_date > this.dates[i]){
					this.pickers[i++].setUTCDate(new_date);
				}
			}
			this.updateDates();
		},
		remove: function(){
			$.map(this.pickers, function(p){ p.remove(); });
			delete this.element.data().datepicker;
		}
	};

	function opts_from_el(el, prefix){
		// Derive options from element data-attrs
		var data = $(el).data(),
			out = {}, inkey,
			replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])'),
			prefix = new RegExp('^' + prefix.toLowerCase());
		for (var key in data)
			if (prefix.test(key)){
				inkey = key.replace(replace, function(_,a){ return a.toLowerCase(); });
				out[inkey] = data[key];
			}
		return out;
	}

	function opts_from_locale(lang){
		// Derive options from locale plugins
		var out = {};
		// Check if "de-DE" style date is available, if not language should
		// fallback to 2 letter code eg "de"
		if (!dates[lang]) {
			lang = lang.split('-')[0]
			if (!dates[lang])
				return;
		}
		var d = dates[lang];
		$.each(locale_opts, function(i,k){
			if (k in d)
				out[k] = d[k];
		});
		return out;
	}

	var old = $.fn.datepicker;
	$.fn.datepicker = function ( option ) {
		var args = Array.apply(null, arguments);
		args.shift();
		var internal_return,
			this_return;
		this.each(function () {
			var $this = $(this),
				data = $this.data('datepicker'),
				options = typeof option == 'object' && option;
			if (!data) {
				var elopts = opts_from_el(this, 'date'),
					// Preliminary otions
					xopts = $.extend({}, defaults, elopts, options),
					locopts = opts_from_locale(xopts.language),
					// Options priority: js args, data-attrs, locales, defaults
					opts = $.extend({}, defaults, locopts, elopts, options);
				if ($this.is('.input-daterange') || opts.inputs){
					var ropts = {
						inputs: opts.inputs || $this.find('input').toArray()
					};
					$this.data('datepicker', (data = new DateRangePicker(this, $.extend(opts, ropts))));
				}
				else{
					$this.data('datepicker', (data = new Datepicker(this, opts)));
				}
			}
			if (typeof option == 'string' && typeof data[option] == 'function') {
				internal_return = data[option].apply(data, args);
				if (internal_return !== undefined)
					return false;
			}
		});
		if (internal_return !== undefined)
			return internal_return;
		else
			return this;
	};

	var defaults = $.fn.datepicker.defaults = {
		autoclose: false,
		beforeShowDay: $.noop,
		calendarWeeks: false,
		clearBtn: false,
		daysOfWeekDisabled: [],
		endDate: Infinity,
		forceParse: true,
		format: 'mm/dd/yyyy',
		keyboardNavigation: true,
		language: 'en',
		minViewMode: 0,
		orientation: "auto",
		rtl: false,
		startDate: -Infinity,
		startView: 0,
		todayBtn: false,
		todayHighlight: false,
		weekStart: 0
	};
	var locale_opts = $.fn.datepicker.locale_opts = [
		'format',
		'rtl',
		'weekStart'
	];
	$.fn.datepicker.Constructor = Datepicker;
	var dates = $.fn.datepicker.dates = {
		en: {
			days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			today: "Today",
			clear: "Clear"
		}
	};

	var DPGlobal = {
		modes: [
			{
				clsName: 'days',
				navFnc: 'Month',
				navStep: 1
			},
			{
				clsName: 'months',
				navFnc: 'FullYear',
				navStep: 1
			},
			{
				clsName: 'years',
				navFnc: 'FullYear',
				navStep: 10
		}],
		isLeapYear: function (year) {
			return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
		},
		getDaysInMonth: function (year, month) {
			return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
		},
		validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
		nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
		parseFormat: function(format){
			// IE treats \0 as a string end in inputs (truncating the value),
			// so it's a bad format delimiter, anyway
			var separators = format.replace(this.validParts, '\0').split('\0'),
				parts = format.match(this.validParts);
			if (!separators || !separators.length || !parts || parts.length === 0){
				throw new Error("Invalid date format.");
			}
			return {separators: separators, parts: parts};
		},
		parseDate: function(date, format, language) {
			if (date instanceof Date) return date;
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
				var part_re = /([\-+]\d+)([dmwy])/,
					parts = date.match(/([\-+]\d+)([dmwy])/g),
					part, dir;
				date = new Date();
				for (var i=0; i<parts.length; i++) {
					part = part_re.exec(parts[i]);
					dir = parseInt(part[1]);
					switch(part[2]){
						case 'd':
							date.setUTCDate(date.getUTCDate() + dir);
							break;
						case 'm':
							date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
							break;
						case 'w':
							date.setUTCDate(date.getUTCDate() + dir * 7);
							break;
						case 'y':
							date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
							break;
					}
				}
				return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
			}
			var parts = date && date.match(this.nonpunctuation) || [],
				date = new Date(),
				parsed = {},
				setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
				setters_map = {
					yyyy: function(d,v){ return d.setUTCFullYear(v); },
					yy: function(d,v){ return d.setUTCFullYear(2000+v); },
					m: function(d,v){
						if (isNaN(d))
							return d;
						v -= 1;
						while (v<0) v += 12;
						v %= 12;
						d.setUTCMonth(v);
						while (d.getUTCMonth() != v)
							d.setUTCDate(d.getUTCDate()-1);
						return d;
					},
					d: function(d,v){ return d.setUTCDate(v); }
				},
				val, filtered, part;
			setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
			setters_map['dd'] = setters_map['d'];
			date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
			var fparts = format.parts.slice();
			// Remove noop parts
			if (parts.length != fparts.length) {
				fparts = $(fparts).filter(function(i,p){
					return $.inArray(p, setters_order) !== -1;
				}).toArray();
			}
			// Process remainder
			if (parts.length == fparts.length) {
				for (var i=0, cnt = fparts.length; i < cnt; i++) {
					val = parseInt(parts[i], 10);
					part = fparts[i];
					if (isNaN(val)) {
						switch(part) {
							case 'MM':
								filtered = $(dates[language].months).filter(function(){
									var m = this.slice(0, parts[i].length),
										p = parts[i].slice(0, m.length);
									return m == p;
								});
								val = $.inArray(filtered[0], dates[language].months) + 1;
								break;
							case 'M':
								filtered = $(dates[language].monthsShort).filter(function(){
									var m = this.slice(0, parts[i].length),
										p = parts[i].slice(0, m.length);
									return m == p;
								});
								val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
								break;
						}
					}
					parsed[part] = val;
				}
				for (var i=0, _date, s; i<setters_order.length; i++){
					s = setters_order[i];
					if (s in parsed && !isNaN(parsed[s])){
						_date = new Date(date);
						setters_map[s](_date, parsed[s]);
						if (!isNaN(_date))
							date = _date;
					}
				}
			}
			return date;
		},
		formatDate: function(date, format, language){
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			var val = {
				d: date.getUTCDate(),
				D: dates[language].daysShort[date.getUTCDay()],
				DD: dates[language].days[date.getUTCDay()],
				m: date.getUTCMonth() + 1,
				M: dates[language].monthsShort[date.getUTCMonth()],
				MM: dates[language].months[date.getUTCMonth()],
				yy: date.getUTCFullYear().toString().substring(2),
				yyyy: date.getUTCFullYear()
			};
			val.dd = (val.d < 10 ? '0' : '') + val.d;
			val.mm = (val.m < 10 ? '0' : '') + val.m;
			var date = [],
				seps = $.extend([], format.separators);
			for (var i=0, cnt = format.parts.length; i <= cnt; i++) {
				if (seps.length)
					date.push(seps.shift());
				date.push(val[format.parts[i]]);
			}
			return date.join('');
		},
		headTemplate: '<thead>'+
							'<tr>'+
								'<th class="prev">&laquo;</th>'+
								'<th colspan="5" class="datepicker-switch"></th>'+
								'<th class="next">&raquo;</th>'+
							'</tr>'+
						'</thead>',
		contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
		footTemplate: '<tfoot><tr><th colspan="7" class="today"></th></tr><tr><th colspan="7" class="clear"></th></tr></tfoot>'
	};
	DPGlobal.template = '<div class="datepicker">'+
							'<div class="datepicker-days">'+
								'<table class=" table-condensed">'+
									DPGlobal.headTemplate+
									'<tbody></tbody>'+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-months">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-years">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
						'</div>';

	$.fn.datepicker.DPGlobal = DPGlobal;


	/* DATEPICKER NO CONFLICT
	* =================== */

	$.fn.datepicker.noConflict = function(){
		$.fn.datepicker = old;
		return this;
	};


	/* DATEPICKER DATA-API
	* ================== */

	$(document).on(
		'focus.datepicker.data-api click.datepicker.data-api',
		'[data-provide="datepicker"]',
		function(e){
			var $this = $(this);
			if ($this.data('datepicker')) return;
			e.preventDefault();
			// component click requires us to explicitly show it
			$this.datepicker('show');
		}
	);
	$(function(){
		$('[data-provide="datepicker-inline"]').datepicker();
	});

}( window.jQuery ));

;(function($){
/**
 * jqGrid English Translation
 * Tony Tomov tony@trirand.com
 * http://trirand.com/blog/ 
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
**/
$.jgrid = $.jgrid || {};
$.extend($.jgrid,{
	defaults : {
		recordtext: "View {0} - {1} of {2}",
		emptyrecords: "No records to view",
		loadtext: "Loading...",
		pgtext : "Page {0} of {1}"
	},
	search : {
		caption: "Search...",
		Find: "Find",
		Reset: "Reset",
		odata: [{ oper:'eq', text:'equal'},{ oper:'ne', text:'not equal'},{ oper:'lt', text:'less'},{ oper:'le', text:'less or equal'},{ oper:'gt', text:'greater'},{ oper:'ge', text:'greater or equal'},{ oper:'bw', text:'begins with'},{ oper:'bn', text:'does not begin with'},{ oper:'in', text:'is in'},{ oper:'ni', text:'is not in'},{ oper:'ew', text:'ends with'},{ oper:'en', text:'does not end with'},{ oper:'cn', text:'contains'},{ oper:'nc', text:'does not contain'}],
		groupOps: [	{ op: "AND", text: "all" },	{ op: "OR",  text: "any" }	]
	},
	edit : {
		addCaption: "Add Record",
		editCaption: "Edit Record",
		bSubmit: "Submit",
		bCancel: "Cancel",
		bClose: "Close",
		saveData: "Data has been changed! Save changes?",
		bYes : "Yes",
		bNo : "No",
		bExit : "Cancel",
		msg: {
			required:"Field is required",
			number:"Please, enter valid number",
			minValue:"value must be greater than or equal to ",
			maxValue:"value must be less than or equal to",
			email: "is not a valid e-mail",
			integer: "Please, enter valid integer value",
			date: "Please, enter valid date value",
			url: "is not a valid URL. Prefix required ('http://' or 'https://')",
			nodefined : " is not defined!",
			novalue : " return value is required!",
			customarray : "Custom function should return array!",
			customfcheck : "Custom function should be present in case of custom checking!"
			
		}
	},
	view : {
		caption: "View Record",
		bClose: "Close"
	},
	del : {
		caption: "Delete",
		msg: "Delete selected record(s)?",
		bSubmit: "Delete",
		bCancel: "Cancel"
	},
	nav : {
		edittext: "",
		edittitle: "Edit selected row",
		addtext:"",
		addtitle: "Add new row",
		deltext: "",
		deltitle: "Delete selected row",
		searchtext: "",
		searchtitle: "Find records",
		refreshtext: "",
		refreshtitle: "Reload Grid",
		alertcap: "Warning",
		alerttext: "Please, select row",
		viewtext: "",
		viewtitle: "View selected row"
	},
	col : {
		caption: "Select columns",
		bSubmit: "Ok",
		bCancel: "Cancel"
	},
	errors : {
		errcap : "Error",
		nourl : "No url is set",
		norecords: "No records to process",
		model : "Length of colNames <> colModel!"
	},
	formatter : {
		integer : {thousandsSeparator: ",", defaultValue: '0'},
		number : {decimalSeparator:".", thousandsSeparator: ",", decimalPlaces: 2, defaultValue: '0.00'},
		currency : {decimalSeparator:".", thousandsSeparator: ",", decimalPlaces: 2, prefix: "", suffix:"", defaultValue: '0.00'},
		date : {
			dayNames:   [
				"Sun", "Mon", "Tue", "Wed", "Thr", "Fri", "Sat",
				"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
			],
			monthNames: [
				"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
				"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
			],
			AmPm : ["am","pm","AM","PM"],
			S: function (j) {return j < 11 || j > 13 ? ['st', 'nd', 'rd', 'th'][Math.min((j - 1) % 10, 3)] : 'th';},
			srcformat: 'Y-m-d',
			newformat: 'n/j/Y',
			parseRe : /[Tt\\\/:_;.,\t\s-]/,
			masks : {
				// see http://php.net/manual/en/function.date.php for PHP format used in jqGrid
				// and see http://docs.jquery.com/UI/Datepicker/formatDate
				// and https://github.com/jquery/globalize#dates for alternative formats used frequently
				// one can find on https://github.com/jquery/globalize/tree/master/lib/cultures many
				// information about date, time, numbers and currency formats used in different countries
				// one should just convert the information in PHP format
				ISO8601Long:"Y-m-d H:i:s",
				ISO8601Short:"Y-m-d",
				// short date:
				//    n - Numeric representation of a month, without leading zeros
				//    j - Day of the month without leading zeros
				//    Y - A full numeric representation of a year, 4 digits
				// example: 3/1/2012 which means 1 March 2012
				ShortDate: "n/j/Y", // in jQuery UI Datepicker: "M/d/yyyy"
				// long date:
				//    l - A full textual representation of the day of the week
				//    F - A full textual representation of a month
				//    d - Day of the month, 2 digits with leading zeros
				//    Y - A full numeric representation of a year, 4 digits
				LongDate: "l, F d, Y", // in jQuery UI Datepicker: "dddd, MMMM dd, yyyy"
				// long date with long time:
				//    l - A full textual representation of the day of the week
				//    F - A full textual representation of a month
				//    d - Day of the month, 2 digits with leading zeros
				//    Y - A full numeric representation of a year, 4 digits
				//    g - 12-hour format of an hour without leading zeros
				//    i - Minutes with leading zeros
				//    s - Seconds, with leading zeros
				//    A - Uppercase Ante meridiem and Post meridiem (AM or PM)
				FullDateTime: "l, F d, Y g:i:s A", // in jQuery UI Datepicker: "dddd, MMMM dd, yyyy h:mm:ss tt"
				// month day:
				//    F - A full textual representation of a month
				//    d - Day of the month, 2 digits with leading zeros
				MonthDay: "F d", // in jQuery UI Datepicker: "MMMM dd"
				// short time (without seconds)
				//    g - 12-hour format of an hour without leading zeros
				//    i - Minutes with leading zeros
				//    A - Uppercase Ante meridiem and Post meridiem (AM or PM)
				ShortTime: "g:i A", // in jQuery UI Datepicker: "h:mm tt"
				// long time (with seconds)
				//    g - 12-hour format of an hour without leading zeros
				//    i - Minutes with leading zeros
				//    s - Seconds, with leading zeros
				//    A - Uppercase Ante meridiem and Post meridiem (AM or PM)
				LongTime: "g:i:s A", // in jQuery UI Datepicker: "h:mm:ss tt"
				SortableDateTime: "Y-m-d\\TH:i:s",
				UniversalSortableDateTime: "Y-m-d H:i:sO",
				// month with year
				//    Y - A full numeric representation of a year, 4 digits
				//    F - A full textual representation of a month
				YearMonth: "F, Y" // in jQuery UI Datepicker: "MMMM, yyyy"
			},
			reformatAfterEdit : false
		},
		baseLinkUrl: '',
		showAction: '',
		target: '',
		checkbox : {disabled:true},
		idName : 'id'
	}
});
})(jQuery);

/* 
* jqGrid  4.5.2 - jQuery Grid 
* Copyright (c) 2008, Tony Tomov, tony@trirand.com 
* Dual licensed under the MIT and GPL licenses 
* http://www.opensource.org/licenses/mit-license.php 
* http://www.gnu.org/licenses/gpl-2.0.html 
* Date:2013-05-21 
* Modules: grid.base.js; jquery.fmatter.js; grid.custom.js; grid.import.js; JsonXml.js; grid.tbltogrid.js; grid.jqueryui.js; 
*/

(function(b){b.jgrid=b.jgrid||{};b.extend(b.jgrid,{version:"4.5.2",htmlDecode:function(b){return b&&("&nbsp;"===b||"&#160;"===b||1===b.length&&160===b.charCodeAt(0))?"":!b?b:(""+b).replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&quot;/g,'"').replace(/&amp;/g,"&")},htmlEncode:function(b){return!b?b:(""+b).replace(/&/g,"&amp;").replace(/\"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},format:function(d){var f=b.makeArray(arguments).slice(1);null==d&&(d="");return d.replace(/\{(\d+)\}/g,
function(b,e){return f[e]})},msie:"Microsoft Internet Explorer"===navigator.appName,msiever:function(){var b=-1;null!=/MSIE ([0-9]{1,}[.0-9]{0,})/.exec(navigator.userAgent)&&(b=parseFloat(RegExp.$1));return b},getCellIndex:function(d){d=b(d);if(d.is("tr"))return-1;d=(!d.is("td")&&!d.is("th")?d.closest("td,th"):d)[0];return b.jgrid.msie?b.inArray(d,d.parentNode.cells):d.cellIndex},stripHtml:function(b){var b=""+b,f=/<("[^"]*"|'[^']*'|[^'">])*>/gi;return b?(b=b.replace(f,""))&&"&nbsp;"!==b&&"&#160;"!==
b?b.replace(/\"/g,"'"):"":b},stripPref:function(d,f){var c=b.type(d);if("string"===c||"number"===c)d=""+d,f=""!==d?(""+f).replace(""+d,""):f;return f},parse:function(d){"while(1);"===d.substr(0,9)&&(d=d.substr(9));"/*"===d.substr(0,2)&&(d=d.substr(2,d.length-4));d||(d="{}");return!0===b.jgrid.useJSON&&"object"===typeof JSON&&"function"===typeof JSON.parse?JSON.parse(d):eval("("+d+")")},parseDate:function(d,f,c,e){var a=/^\/Date\((([-+])?[0-9]+)(([-+])([0-9]{2})([0-9]{2}))?\)\/$/,j="string"===typeof f?
f.match(a):null,a=function(a,b){a=""+a;for(b=parseInt(b,10)||2;a.length<b;)a="0"+a;return a},g={m:1,d:1,y:1970,h:0,i:0,s:0,u:0},h=0,i,k,h=function(a,b){0===a?12===b&&(b=0):12!==b&&(b+=12);return b};void 0===e&&(e=b.jgrid.formatter.date);void 0===e.parseRe&&(e.parseRe=/[Tt\\\/:_;.,\t\s-]/);e.masks.hasOwnProperty(d)&&(d=e.masks[d]);if(f&&null!=f)if(!isNaN(f-0)&&"u"===(""+d).toLowerCase())h=new Date(1E3*parseFloat(f));else if(f.constructor===Date)h=f;else if(null!==j)h=new Date(parseInt(j[1],10)),j[3]&&
(d=60*Number(j[5])+Number(j[6]),d*="-"===j[4]?1:-1,d-=h.getTimezoneOffset(),h.setTime(Number(Number(h)+6E4*d)));else{f=(""+f).replace(/\\T/g,"T").replace(/\\t/,"t").split(e.parseRe);d=d.replace(/\\T/g,"T").replace(/\\t/,"t").split(e.parseRe);i=0;for(k=d.length;i<k;i++)"M"===d[i]&&(j=b.inArray(f[i],e.monthNames),-1!==j&&12>j&&(f[i]=j+1,g.m=f[i])),"F"===d[i]&&(j=b.inArray(f[i],e.monthNames,12),-1!==j&&11<j&&(f[i]=j+1-12,g.m=f[i])),"a"===d[i]&&(j=b.inArray(f[i],e.AmPm),-1!==j&&2>j&&f[i]===e.AmPm[j]&&
(f[i]=j,g.h=h(f[i],g.h))),"A"===d[i]&&(j=b.inArray(f[i],e.AmPm),-1!==j&&1<j&&f[i]===e.AmPm[j]&&(f[i]=j-2,g.h=h(f[i],g.h))),"g"===d[i]&&(g.h=parseInt(f[i],10)),void 0!==f[i]&&(g[d[i].toLowerCase()]=parseInt(f[i],10));g.f&&(g.m=g.f);if(0===g.m&&0===g.y&&0===g.d)return"&#160;";g.m=parseInt(g.m,10)-1;h=g.y;70<=h&&99>=h?g.y=1900+g.y:0<=h&&69>=h&&(g.y=2E3+g.y);h=new Date(g.y,g.m,g.d,g.h,g.i,g.s,g.u)}else h=new Date(g.y,g.m,g.d,g.h,g.i,g.s,g.u);if(void 0===c)return h;e.masks.hasOwnProperty(c)?c=e.masks[c]:
c||(c="Y-m-d");d=h.getHours();f=h.getMinutes();g=h.getDate();j=h.getMonth()+1;i=h.getTimezoneOffset();k=h.getSeconds();var l=h.getMilliseconds(),o=h.getDay(),n=h.getFullYear(),m=(o+6)%7+1,t=(new Date(n,j-1,g)-new Date(n,0,1))/864E5,A={d:a(g),D:e.dayNames[o],j:g,l:e.dayNames[o+7],N:m,S:e.S(g),w:o,z:t,W:5>m?Math.floor((t+m-1)/7)+1:Math.floor((t+m-1)/7)||(4>((new Date(n-1,0,1)).getDay()+6)%7?53:52),F:e.monthNames[j-1+12],m:a(j),M:e.monthNames[j-1],n:j,t:"?",L:"?",o:"?",Y:n,y:(""+n).substring(2),a:12>
d?e.AmPm[0]:e.AmPm[1],A:12>d?e.AmPm[2]:e.AmPm[3],B:"?",g:d%12||12,G:d,h:a(d%12||12),H:a(d),i:a(f),s:a(k),u:l,e:"?",I:"?",O:(0<i?"-":"+")+a(100*Math.floor(Math.abs(i)/60)+Math.abs(i)%60,4),P:"?",T:((""+h).match(/\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g)||[""]).pop().replace(/[^-+\dA-Z]/g,""),Z:"?",c:"?",r:"?",U:Math.floor(h/1E3)};return c.replace(/\\.|[dDjlNSwzWFmMntLoYyaABgGhHisueIOPTZcrU]/g,function(a){return A.hasOwnProperty(a)?
A[a]:a.substring(1)})},jqID:function(b){return(""+b).replace(/[!"#$%&'()*+,.\/:; <=>?@\[\\\]\^`{|}~]/g,"\\$&")},guid:1,uidPref:"jqg",randId:function(d){return(d||b.jgrid.uidPref)+b.jgrid.guid++},getAccessor:function(b,f){var c,e,a=[],j;if("function"===typeof f)return f(b);c=b[f];if(void 0===c)try{if("string"===typeof f&&(a=f.split(".")),j=a.length)for(c=b;c&&j--;)e=a.shift(),c=c[e]}catch(g){}return c},getXmlData:function(d,f,c){var e="string"===typeof f?f.match(/^(.*)\[(\w+)\]$/):null;if("function"===
typeof f)return f(d);if(e&&e[2])return e[1]?b(e[1],d).attr(e[2]):b(d).attr(e[2]);d=b(f,d);return c?d:0<d.length?b(d).text():void 0},cellWidth:function(){var d=b("<div class='ui-jqgrid' style='left:10000px'><table class='ui-jqgrid-btable' style='width:5px;'><tr class='jqgrow'><td style='width:5px;'></td></tr></table></div>"),f=d.appendTo("body").find("td").width();d.remove();return 5!==f},cell_width:!0,ajaxOptions:{},from:function(d){return new function(d,c){"string"===typeof d&&(d=b.data(d));var e=
this,a=d,j=!0,g=!1,h=c,i=/[\$,%]/g,k=null,l=null,o=0,n=!1,m="",t=[],A=!0;if("object"===typeof d&&d.push)0<d.length&&(A="object"!==typeof d[0]?!1:!0);else throw"data provides is not an array";this._hasData=function(){return null===a?!1:0===a.length?!1:!0};this._getStr=function(a){var b=[];g&&b.push("jQuery.trim(");b.push("String("+a+")");g&&b.push(")");j||b.push(".toLowerCase()");return b.join("")};this._strComp=function(a){return"string"===typeof a?".toString()":""};this._group=function(a,b){return{field:a.toString(),
unique:b,items:[]}};this._toStr=function(a){g&&(a=b.trim(a));a=a.toString().replace(/\\/g,"\\\\").replace(/\"/g,'\\"');return j?a:a.toLowerCase()};this._funcLoop=function(e){var d=[];b.each(a,function(a,b){d.push(e(b))});return d};this._append=function(a){var b;h=null===h?"":h+(""===m?" && ":m);for(b=0;b<o;b++)h+="(";n&&(h+="!");h+="("+a+")";n=!1;m="";o=0};this._setCommand=function(a,b){k=a;l=b};this._resetNegate=function(){n=!1};this._repeatCommand=function(a,b){return null===k?e:null!==a&&null!==
b?k(a,b):null===l||!A?k(a):k(l,a)};this._equals=function(a,b){return 0===e._compare(a,b,1)};this._compare=function(a,b,e){var d=Object.prototype.toString;void 0===e&&(e=1);void 0===a&&(a=null);void 0===b&&(b=null);if(null===a&&null===b)return 0;if(null===a&&null!==b)return 1;if(null!==a&&null===b)return-1;if("[object Date]"===d.call(a)&&"[object Date]"===d.call(b))return a<b?-e:a>b?e:0;!j&&"number"!==typeof a&&"number"!==typeof b&&(a=""+a,b=""+b);return a<b?-e:a>b?e:0};this._performSort=function(){0!==
t.length&&(a=e._doSort(a,0))};this._doSort=function(a,b){var d=t[b].by,g=t[b].dir,j=t[b].type,c=t[b].datefmt;if(b===t.length-1)return e._getOrder(a,d,g,j,c);b++;for(var d=e._getGroup(a,d,g,j,c),g=[],f,j=0;j<d.length;j++){f=e._doSort(d[j].items,b);for(c=0;c<f.length;c++)g.push(f[c])}return g};this._getOrder=function(a,d,g,c,f){var h=[],k=[],l="a"===g?1:-1,o,n;void 0===c&&(c="text");n="float"===c||"number"===c||"currency"===c||"numeric"===c?function(a){a=parseFloat((""+a).replace(i,""));return isNaN(a)?
0:a}:"int"===c||"integer"===c?function(a){return a?parseFloat((""+a).replace(i,"")):0}:"date"===c||"datetime"===c?function(a){return b.jgrid.parseDate(f,a).getTime()}:b.isFunction(c)?c:function(a){a=a?b.trim(""+a):"";return j?a:a.toLowerCase()};b.each(a,function(a,e){o=""!==d?b.jgrid.getAccessor(e,d):e;void 0===o&&(o="");o=n(o,e);k.push({vSort:o,index:a})});k.sort(function(a,b){a=a.vSort;b=b.vSort;return e._compare(a,b,l)});for(var c=0,m=a.length;c<m;)g=k[c].index,h.push(a[g]),c++;return h};this._getGroup=
function(a,d,g,j,c){var f=[],h=null,i=null,k;b.each(e._getOrder(a,d,g,j,c),function(a,g){k=b.jgrid.getAccessor(g,d);null==k&&(k="");e._equals(i,k)||(i=k,null!==h&&f.push(h),h=e._group(d,k));h.items.push(g)});null!==h&&f.push(h);return f};this.ignoreCase=function(){j=!1;return e};this.useCase=function(){j=!0;return e};this.trim=function(){g=!0;return e};this.noTrim=function(){g=!1;return e};this.execute=function(){var d=h,g=[];if(null===d)return e;b.each(a,function(){eval(d)&&g.push(this)});a=g;return e};
this.data=function(){return a};this.select=function(d){e._performSort();if(!e._hasData())return[];e.execute();if(b.isFunction(d)){var g=[];b.each(a,function(a,b){g.push(d(b))});return g}return a};this.hasMatch=function(){if(!e._hasData())return!1;e.execute();return 0<a.length};this.andNot=function(a,b,d){n=!n;return e.and(a,b,d)};this.orNot=function(a,b,d){n=!n;return e.or(a,b,d)};this.not=function(a,b,d){return e.andNot(a,b,d)};this.and=function(a,b,d){m=" && ";return void 0===a?e:e._repeatCommand(a,
b,d)};this.or=function(a,b,d){m=" || ";return void 0===a?e:e._repeatCommand(a,b,d)};this.orBegin=function(){o++;return e};this.orEnd=function(){null!==h&&(h+=")");return e};this.isNot=function(a){n=!n;return e.is(a)};this.is=function(a){e._append("this."+a);e._resetNegate();return e};this._compareValues=function(a,d,g,j,c){var f;f=A?"jQuery.jgrid.getAccessor(this,'"+d+"')":"this";void 0===g&&(g=null);var h=g,k=void 0===c.stype?"text":c.stype;if(null!==g)switch(k){case "int":case "integer":h=isNaN(Number(h))||
""===h?"0":h;f="parseInt("+f+",10)";h="parseInt("+h+",10)";break;case "float":case "number":case "numeric":h=(""+h).replace(i,"");h=isNaN(Number(h))||""===h?"0":h;f="parseFloat("+f+")";h="parseFloat("+h+")";break;case "date":case "datetime":h=""+b.jgrid.parseDate(c.newfmt||"Y-m-d",h).getTime();f='jQuery.jgrid.parseDate("'+c.srcfmt+'",'+f+").getTime()";break;default:f=e._getStr(f),h=e._getStr('"'+e._toStr(h)+'"')}e._append(f+" "+j+" "+h);e._setCommand(a,d);e._resetNegate();return e};this.equals=function(a,
b,d){return e._compareValues(e.equals,a,b,"==",d)};this.notEquals=function(a,b,d){return e._compareValues(e.equals,a,b,"!==",d)};this.isNull=function(a,b,d){return e._compareValues(e.equals,a,null,"===",d)};this.greater=function(a,b,d){return e._compareValues(e.greater,a,b,">",d)};this.less=function(a,b,d){return e._compareValues(e.less,a,b,"<",d)};this.greaterOrEquals=function(a,b,d){return e._compareValues(e.greaterOrEquals,a,b,">=",d)};this.lessOrEquals=function(a,b,d){return e._compareValues(e.lessOrEquals,
a,b,"<=",d)};this.startsWith=function(a,d){var c=null==d?a:d,c=g?b.trim(c.toString()).length:c.toString().length;A?e._append(e._getStr("jQuery.jgrid.getAccessor(this,'"+a+"')")+".substr(0,"+c+") == "+e._getStr('"'+e._toStr(d)+'"')):(c=g?b.trim(d.toString()).length:d.toString().length,e._append(e._getStr("this")+".substr(0,"+c+") == "+e._getStr('"'+e._toStr(a)+'"')));e._setCommand(e.startsWith,a);e._resetNegate();return e};this.endsWith=function(a,d){var c=null==d?a:d,c=g?b.trim(c.toString()).length:
c.toString().length;A?e._append(e._getStr("jQuery.jgrid.getAccessor(this,'"+a+"')")+".substr("+e._getStr("jQuery.jgrid.getAccessor(this,'"+a+"')")+".length-"+c+","+c+') == "'+e._toStr(d)+'"'):e._append(e._getStr("this")+".substr("+e._getStr("this")+'.length-"'+e._toStr(a)+'".length,"'+e._toStr(a)+'".length) == "'+e._toStr(a)+'"');e._setCommand(e.endsWith,a);e._resetNegate();return e};this.contains=function(a,b){A?e._append(e._getStr("jQuery.jgrid.getAccessor(this,'"+a+"')")+'.indexOf("'+e._toStr(b)+
'",0) > -1'):e._append(e._getStr("this")+'.indexOf("'+e._toStr(a)+'",0) > -1');e._setCommand(e.contains,a);e._resetNegate();return e};this.groupBy=function(b,d,g,c){return!e._hasData()?null:e._getGroup(a,b,d,g,c)};this.orderBy=function(a,d,g,c){d=null==d?"a":b.trim(d.toString().toLowerCase());null==g&&(g="text");null==c&&(c="Y-m-d");if("desc"===d||"descending"===d)d="d";if("asc"===d||"ascending"===d)d="a";t.push({by:a,dir:d,type:g,datefmt:c});return e};return e}(d,null)},getMethod:function(d){return this.getAccessor(b.fn.jqGrid,
d)},extend:function(d){b.extend(b.fn.jqGrid,d);this.no_legacy_api||b.fn.extend(d)}});b.fn.jqGrid=function(d){if("string"===typeof d){var f=b.jgrid.getMethod(d);if(!f)throw"jqGrid - No such method: "+d;var c=b.makeArray(arguments).slice(1);return f.apply(this,c)}return this.each(function(){if(!this.grid){var e=b.extend(!0,{url:"",height:150,page:1,rowNum:20,rowTotal:null,records:0,pager:"",pgbuttons:!0,pginput:!0,colModel:[],rowList:[],colNames:[],sortorder:"asc",sortname:"",datatype:"xml",mtype:"GET",
altRows:!1,selarrrow:[],savedRow:[],shrinkToFit:!0,xmlReader:{},jsonReader:{},subGrid:!1,subGridModel:[],reccount:0,lastpage:0,lastsort:0,selrow:null,beforeSelectRow:null,onSelectRow:null,onSortCol:null,ondblClickRow:null,onRightClickRow:null,onPaging:null,onSelectAll:null,onInitGrid:null,loadComplete:null,gridComplete:null,loadError:null,loadBeforeSend:null,afterInsertRow:null,beforeRequest:null,beforeProcessing:null,onHeaderClick:null,viewrecords:!1,loadonce:!1,multiselect:!1,multikey:!1,editurl:null,
search:!1,caption:"",hidegrid:!0,hiddengrid:!1,postData:{},userData:{},treeGrid:!1,treeGridModel:"nested",treeReader:{},treeANode:-1,ExpandColumn:null,tree_root_level:0,prmNames:{page:"page",rows:"rows",sort:"sidx",order:"sord",search:"_search",nd:"nd",id:"id",oper:"oper",editoper:"edit",addoper:"add",deloper:"del",subgridid:"id",npage:null,totalrows:"totalrows"},forceFit:!1,gridstate:"visible",cellEdit:!1,cellsubmit:"remote",nv:0,loadui:"enable",toolbar:[!1,""],scroll:!1,multiboxonly:!1,deselectAfterSort:!0,
scrollrows:!1,autowidth:!1,scrollOffset:18,cellLayout:5,subGridWidth:20,multiselectWidth:20,gridview:!1,rownumWidth:25,rownumbers:!1,pagerpos:"center",recordpos:"right",footerrow:!1,userDataOnFooter:!1,hoverrows:!0,altclass:"ui-priority-secondary",viewsortcols:[!1,"vertical",!0],resizeclass:"",autoencode:!1,remapColumns:[],ajaxGridOptions:{},direction:"ltr",toppager:!1,headertitles:!1,scrollTimeout:40,data:[],_index:{},grouping:!1,groupingView:{groupField:[],groupOrder:[],groupText:[],groupColumnShow:[],
groupSummary:[],showSummaryOnHide:!1,sortitems:[],sortnames:[],summary:[],summaryval:[],plusicon:"ui-icon-circlesmall-plus",minusicon:"ui-icon-circlesmall-minus",displayField:[]},ignoreCase:!1,cmTemplate:{},idPrefix:"",multiSort:!1},b.jgrid.defaults,d||{}),a=this,c={headers:[],cols:[],footers:[],dragStart:function(c,d,g){this.resizing={idx:c,startX:d.clientX,sOL:g[0]};this.hDiv.style.cursor="col-resize";this.curGbox=b("#rs_m"+b.jgrid.jqID(e.id),"#gbox_"+b.jgrid.jqID(e.id));this.curGbox.css({display:"block",
left:g[0],top:g[1],height:g[2]});b(a).triggerHandler("jqGridResizeStart",[d,c]);b.isFunction(e.resizeStart)&&e.resizeStart.call(a,d,c);document.onselectstart=function(){return!1}},dragMove:function(a){if(this.resizing){var b=a.clientX-this.resizing.startX,a=this.headers[this.resizing.idx],c="ltr"===e.direction?a.width+b:a.width-b,d;33<c&&(this.curGbox.css({left:this.resizing.sOL+b}),!0===e.forceFit?(d=this.headers[this.resizing.idx+e.nv],b="ltr"===e.direction?d.width-b:d.width+b,33<b&&(a.newWidth=
c,d.newWidth=b)):(this.newWidth="ltr"===e.direction?e.tblwidth+b:e.tblwidth-b,a.newWidth=c))}},dragEnd:function(){this.hDiv.style.cursor="default";if(this.resizing){var c=this.resizing.idx,d=this.headers[c].newWidth||this.headers[c].width,d=parseInt(d,10);this.resizing=!1;b("#rs_m"+b.jgrid.jqID(e.id)).css("display","none");e.colModel[c].width=d;this.headers[c].width=d;this.headers[c].el.style.width=d+"px";this.cols[c].style.width=d+"px";0<this.footers.length&&(this.footers[c].style.width=d+"px");
!0===e.forceFit?(d=this.headers[c+e.nv].newWidth||this.headers[c+e.nv].width,this.headers[c+e.nv].width=d,this.headers[c+e.nv].el.style.width=d+"px",this.cols[c+e.nv].style.width=d+"px",0<this.footers.length&&(this.footers[c+e.nv].style.width=d+"px"),e.colModel[c+e.nv].width=d):(e.tblwidth=this.newWidth||e.tblwidth,b("table:first",this.bDiv).css("width",e.tblwidth+"px"),b("table:first",this.hDiv).css("width",e.tblwidth+"px"),this.hDiv.scrollLeft=this.bDiv.scrollLeft,e.footerrow&&(b("table:first",
this.sDiv).css("width",e.tblwidth+"px"),this.sDiv.scrollLeft=this.bDiv.scrollLeft));b(a).triggerHandler("jqGridResizeStop",[d,c]);b.isFunction(e.resizeStop)&&e.resizeStop.call(a,d,c)}this.curGbox=null;document.onselectstart=function(){return!0}},populateVisible:function(){c.timer&&clearTimeout(c.timer);c.timer=null;var a=b(c.bDiv).height();if(a){var d=b("table:first",c.bDiv),g,f;if(d[0].rows.length)try{f=(g=d[0].rows[1])?b(g).outerHeight()||c.prevRowHeight:c.prevRowHeight}catch(ua){f=c.prevRowHeight}if(f){c.prevRowHeight=
f;var h=e.rowNum;g=c.scrollTop=c.bDiv.scrollTop;var i=Math.round(d.position().top)-g,k=i+d.height();f*=h;var z,F,y;if(k<a&&0>=i&&(void 0===e.lastpage||parseInt((k+g+f-1)/f,10)<=e.lastpage))F=parseInt((a-k+f-1)/f,10),0<=k||2>F||!0===e.scroll?(z=Math.round((k+g)/f)+1,i=-1):i=1;0<i&&(z=parseInt(g/f,10)+1,F=parseInt((g+a)/f,10)+2-z,y=!0);if(F&&(!e.lastpage||!(z>e.lastpage||1===e.lastpage||z===e.page&&z===e.lastpage)))c.hDiv.loading?c.timer=setTimeout(c.populateVisible,e.scrollTimeout):(e.page=z,y&&(c.selectionPreserver(d[0]),
c.emptyRows.call(d[0],!1,!1)),c.populate(F))}}},scrollGrid:function(a){if(e.scroll){var b=c.bDiv.scrollTop;void 0===c.scrollTop&&(c.scrollTop=0);b!==c.scrollTop&&(c.scrollTop=b,c.timer&&clearTimeout(c.timer),c.timer=setTimeout(c.populateVisible,e.scrollTimeout))}c.hDiv.scrollLeft=c.bDiv.scrollLeft;e.footerrow&&(c.sDiv.scrollLeft=c.bDiv.scrollLeft);a&&a.stopPropagation()},selectionPreserver:function(a){var c=a.p,d=c.selrow,e=c.selarrrow?b.makeArray(c.selarrrow):null,g=a.grid.bDiv.scrollLeft,f=function(){var h;
c.selrow=null;c.selarrrow=[];if(c.multiselect&&e&&0<e.length)for(h=0;h<e.length;h++)e[h]!==d&&b(a).jqGrid("setSelection",e[h],!1,null);d&&b(a).jqGrid("setSelection",d,!1,null);a.grid.bDiv.scrollLeft=g;b(a).unbind(".selectionPreserver",f)};b(a).bind("jqGridGridComplete.selectionPreserver",f)}};if("TABLE"!==this.tagName.toUpperCase())alert("Element is not a table");else if(void 0!==document.documentMode&&5>=document.documentMode)alert("Grid can not be used in this ('quirks') mode!");else{b(this).empty().attr("tabindex",
"0");this.p=e;this.p.useProp=!!b.fn.prop;var g,f;if(0===this.p.colNames.length)for(g=0;g<this.p.colModel.length;g++)this.p.colNames[g]=this.p.colModel[g].label||this.p.colModel[g].name;if(this.p.colNames.length!==this.p.colModel.length)alert(b.jgrid.errors.model);else{var i=b("<div class='ui-jqgrid-view'></div>"),k=b.jgrid.msie;a.p.direction=b.trim(a.p.direction.toLowerCase());-1===b.inArray(a.p.direction,["ltr","rtl"])&&(a.p.direction="ltr");f=a.p.direction;b(i).insertBefore(this);b(this).removeClass("scroll").appendTo(i);
var l=b("<div class='ui-jqgrid ui-widget ui-widget-content ui-corner-all'></div>");b(l).attr({id:"gbox_"+this.id,dir:f}).insertBefore(i);b(i).attr("id","gview_"+this.id).appendTo(l);b("<div class='ui-widget-overlay jqgrid-overlay' id='lui_"+this.id+"'></div>").insertBefore(i);b("<div class='loading ui-state-default ui-state-active' id='load_"+this.id+"'>"+this.p.loadtext+"</div>").insertBefore(i);b(this).attr({cellspacing:"0",cellpadding:"0",border:"0",role:"grid","aria-multiselectable":!!this.p.multiselect,
"aria-labelledby":"gbox_"+this.id});var o=function(a,b){a=parseInt(a,10);return isNaN(a)?b||0:a},n=function(d,e,g,f,h,i){var R=a.p.colModel[d],k=R.align,z='style="',F=R.classes,y=R.name,G=[];k&&(z=z+("text-align:"+k+";"));R.hidden===true&&(z=z+"display:none;");if(e===0)z=z+("width: "+c.headers[d].width+"px;");else if(R.cellattr&&b.isFunction(R.cellattr))if((d=R.cellattr.call(a,h,g,f,R,i))&&typeof d==="string"){d=d.replace(/style/i,"style").replace(/title/i,"title");if(d.indexOf("title")>-1)R.title=
false;d.indexOf("class")>-1&&(F=void 0);G=d.split(/[^-]style/);if(G.length===2){G[1]=b.trim(G[1].replace("=",""));if(G[1].indexOf("'")===0||G[1].indexOf('"')===0)G[1]=G[1].substring(1);z=z+G[1].replace(/'/gi,'"')}else z=z+'"'}if(!G.length){G[0]="";z=z+'"'}z=z+((F!==void 0?' class="'+F+'"':"")+(R.title&&g?' title="'+b.jgrid.stripHtml(g)+'"':""));z=z+(' aria-describedby="'+a.p.id+"_"+y+'"');return z+G[0]},m=function(c){return c==null||c===""?"&#160;":a.p.autoencode?b.jgrid.htmlEncode(c):""+c},t=function(c,
d,e,g,f){var h=a.p.colModel[e];if(h.formatter!==void 0){c=""+a.p.idPrefix!==""?b.jgrid.stripPref(a.p.idPrefix,c):c;c={rowId:c,colModel:h,gid:a.p.id,pos:e};d=b.isFunction(h.formatter)?h.formatter.call(a,d,c,g,f):b.fmatter?b.fn.fmatter.call(a,h.formatter,d,c,g,f):m(d)}else d=m(d);return d},A=function(a,b,c,d,e,g){b=t(a,b,c,e,"add");return'<td role="gridcell" '+n(c,d,b,e,a,g)+">"+b+"</td>"},T=function(b,c,d,e){e='<input role="checkbox" type="checkbox" id="jqg_'+a.p.id+"_"+b+'" class="cbox" name="jqg_'+
a.p.id+"_"+b+'"'+(e?'checked="checked"':"")+"/>";return'<td role="gridcell" '+n(c,d,"",null,b,true)+">"+e+"</td>"},M=function(a,b,c,d){c=(parseInt(c,10)-1)*parseInt(d,10)+1+b;return'<td role="gridcell" class="ui-state-default jqgrid-rownum" '+n(a,b,c,null,b,true)+">"+c+"</td>"},$=function(b){var c,d=[],e=0,g;for(g=0;g<a.p.colModel.length;g++){c=a.p.colModel[g];if(c.name!=="cb"&&c.name!=="subgrid"&&c.name!=="rn"){d[e]=b==="local"?c.name:b==="xml"||b==="xmlstring"?c.xmlmap||c.name:c.jsonmap||c.name;
e++}}return d},U=function(c){var d=a.p.remapColumns;if(!d||!d.length)d=b.map(a.p.colModel,function(a,b){return b});c&&(d=b.map(d,function(a){return a<c?null:a-c}));return d},V=function(a,c){var d;if(this.p.deepempty)b(this.rows).slice(1).remove();else{d=this.rows.length>0?this.rows[0]:null;b(this.firstChild).empty().append(d)}if(a&&this.p.scroll){b(this.grid.bDiv.firstChild).css({height:"auto"});b(this.grid.bDiv.firstChild.firstChild).css({height:0,display:"none"});if(this.grid.bDiv.scrollTop!==0)this.grid.bDiv.scrollTop=
0}if(c===true&&this.p.treeGrid){this.p.data=[];this.p._index={}}},N=function(){var c=a.p.data.length,d,e,g;d=a.p.rownumbers===true?1:0;e=a.p.multiselect===true?1:0;g=a.p.subGrid===true?1:0;d=a.p.keyIndex===false||a.p.loadonce===true?a.p.localReader.id:a.p.colModel[a.p.keyIndex+e+g+d].name;for(e=0;e<c;e++){g=b.jgrid.getAccessor(a.p.data[e],d);g===void 0&&(g=""+(e+1));a.p._index[g]=e}},X=function(c,d,e,g,f,h){var j="-1",i="",k,d=d?"display:none;":"",e="ui-widget-content jqgrow ui-row-"+a.p.direction+
(e?" "+e:"")+(h?" ui-state-highlight":""),h=b(a).triggerHandler("jqGridRowAttr",[g,f,c]);typeof h!=="object"&&(h=b.isFunction(a.p.rowattr)?a.p.rowattr.call(a,g,f,c):{});if(!b.isEmptyObject(h)){if(h.hasOwnProperty("id")){c=h.id;delete h.id}if(h.hasOwnProperty("tabindex")){j=h.tabindex;delete h.tabindex}if(h.hasOwnProperty("style")){d=d+h.style;delete h.style}if(h.hasOwnProperty("class")){e=e+(" "+h["class"]);delete h["class"]}try{delete h.role}catch(F){}for(k in h)h.hasOwnProperty(k)&&(i=i+(" "+k+
"="+h[k]))}return'<tr role="row" id="'+c+'" tabindex="'+j+'" class="'+e+'"'+(d===""?"":' style="'+d+'"')+i+">"},J=function(c,d,e,g,f){var h=new Date,j=a.p.datatype!=="local"&&a.p.loadonce||a.p.datatype==="xmlstring",i=a.p.xmlReader,k=a.p.datatype==="local"?"local":"xml";if(j){a.p.data=[];a.p._index={};a.p.localReader.id="_id_"}a.p.reccount=0;if(b.isXMLDoc(c)){if(a.p.treeANode===-1&&!a.p.scroll){V.call(a,false,true);e=1}else e=e>1?e:1;var F=b(a),y,G,l=0,o,s=a.p.multiselect===true?1:0,u=0,n,m=a.p.rownumbers===
true?1:0,t,p=[],E,q={},x,D,r=[],K=a.p.altRows===true?a.p.altclass:"",v;if(a.p.subGrid===true){u=1;n=b.jgrid.getMethod("addSubGridCell")}i.repeatitems||(p=$(k));t=a.p.keyIndex===false?b.isFunction(i.id)?i.id.call(a,c):i.id:a.p.keyIndex;if(p.length>0&&!isNaN(t)){a.p.remapColumns&&a.p.remapColumns.length&&(t=b.inArray(t,a.p.remapColumns));t=p[t]}k=(""+t).indexOf("[")===-1?p.length?function(a,c){return b(t,a).text()||c}:function(a,c){return b(i.cell,a).eq(t).text()||c}:function(a,b){return a.getAttribute(t.replace(/[\[\]]/g,
""))||b};a.p.userData={};a.p.page=b.jgrid.getXmlData(c,i.page)||a.p.page||0;a.p.lastpage=b.jgrid.getXmlData(c,i.total);if(a.p.lastpage===void 0)a.p.lastpage=1;a.p.records=b.jgrid.getXmlData(c,i.records)||0;b.isFunction(i.userdata)?a.p.userData=i.userdata.call(a,c)||{}:b.jgrid.getXmlData(c,i.userdata,true).each(function(){a.p.userData[this.getAttribute("name")]=b(this).text()});c=b.jgrid.getXmlData(c,i.root,true);(c=b.jgrid.getXmlData(c,i.row,true))||(c=[]);var w=c.length,L=0,B=[],C=parseInt(a.p.rowNum,
10),H=a.p.scroll?b.jgrid.randId():1;if(w>0&&a.p.page<=0)a.p.page=1;if(c&&w){f&&(C=C*(f+1));var f=b.isFunction(a.p.afterInsertRow),J=false,I;if(a.p.grouping){J=a.p.groupingView.groupCollapse===true;I=b.jgrid.getMethod("groupingPrepare")}for(;L<w;){x=c[L];D=k(x,H+L);D=a.p.idPrefix+D;y=e===0?0:e+1;v=(y+L)%2===1?K:"";var O=r.length;r.push("");m&&r.push(M(0,L,a.p.page,a.p.rowNum));s&&r.push(T(D,m,L,false));u&&r.push(n.call(F,s+m,L+e));if(i.repeatitems){E||(E=U(s+u+m));var N=b.jgrid.getXmlData(x,i.cell,
true);b.each(E,function(b){var c=N[this];if(!c)return false;o=c.textContent||c.text;q[a.p.colModel[b+s+u+m].name]=o;r.push(A(D,o,b+s+u+m,L+e,x,q))})}else for(y=0;y<p.length;y++){o=b.jgrid.getXmlData(x,p[y]);q[a.p.colModel[y+s+u+m].name]=o;r.push(A(D,o,y+s+u+m,L+e,x,q))}r[O]=X(D,J,v,q,x,false);r.push("</tr>");if(a.p.grouping){B=I.call(F,r,B,q,L);r=[]}if(j||a.p.treeGrid===true){q._id_=b.jgrid.stripPref(a.p.idPrefix,D);a.p.data.push(q);a.p._index[q._id_]=a.p.data.length-1}if(a.p.gridview===false){b("tbody:first",
d).append(r.join(""));F.triggerHandler("jqGridAfterInsertRow",[D,q,x]);f&&a.p.afterInsertRow.call(a,D,q,x);r=[]}q={};l++;L++;if(l===C)break}}if(a.p.gridview===true){G=a.p.treeANode>-1?a.p.treeANode:0;if(a.p.grouping){F.jqGrid("groupingRender",B,a.p.colModel.length);B=null}else a.p.treeGrid===true&&G>0?b(a.rows[G]).after(r.join("")):b("tbody:first",d).append(r.join(""))}if(a.p.subGrid===true)try{F.jqGrid("addSubGrid",s+m)}catch(Q){}a.p.totaltime=new Date-h;if(l>0&&a.p.records===0)a.p.records=w;r=null;
if(a.p.treeGrid===true)try{F.jqGrid("setTreeNode",G+1,l+G+1)}catch(S){}if(!a.p.treeGrid&&!a.p.scroll)a.grid.bDiv.scrollTop=0;a.p.reccount=l;a.p.treeANode=-1;a.p.userDataOnFooter&&F.jqGrid("footerData","set",a.p.userData,true);if(j){a.p.records=w;a.p.lastpage=Math.ceil(w/C)}g||a.updatepager(false,true);if(j)for(;l<w;){x=c[l];D=k(x,l+H);D=a.p.idPrefix+D;if(i.repeatitems){E||(E=U(s+u+m));var P=b.jgrid.getXmlData(x,i.cell,true);b.each(E,function(b){var c=P[this];if(!c)return false;o=c.textContent||c.text;
q[a.p.colModel[b+s+u+m].name]=o})}else for(y=0;y<p.length;y++){o=b.jgrid.getXmlData(x,p[y]);q[a.p.colModel[y+s+u+m].name]=o}q._id_=b.jgrid.stripPref(a.p.idPrefix,D);a.p.data.push(q);a.p._index[q._id_]=a.p.data.length-1;q={};l++}}},S=function(c,d,e,g,f){var h=new Date;if(c){if(a.p.treeANode===-1&&!a.p.scroll){V.call(a,false,true);e=1}else e=e>1?e:1;var i,j=a.p.datatype!=="local"&&a.p.loadonce||a.p.datatype==="jsonstring";if(j){a.p.data=[];a.p._index={};a.p.localReader.id="_id_"}a.p.reccount=0;if(a.p.datatype===
"local"){d=a.p.localReader;i="local"}else{d=a.p.jsonReader;i="json"}var k=b(a),l=0,y,o,n,m=[],s=a.p.multiselect?1:0,u=a.p.subGrid===true?1:0,t,p=a.p.rownumbers===true?1:0,w=U(s+u+p);i=$(i);var v,E,q,x={},D,r,K=[],B=a.p.altRows===true?a.p.altclass:"",C;a.p.page=b.jgrid.getAccessor(c,d.page)||a.p.page||0;E=b.jgrid.getAccessor(c,d.total);u&&(t=b.jgrid.getMethod("addSubGridCell"));a.p.lastpage=E===void 0?1:E;a.p.records=b.jgrid.getAccessor(c,d.records)||0;a.p.userData=b.jgrid.getAccessor(c,d.userdata)||
{};q=a.p.keyIndex===false?b.isFunction(d.id)?d.id.call(a,c):d.id:a.p.keyIndex;if(!d.repeatitems){m=i;if(m.length>0&&!isNaN(q)){a.p.remapColumns&&a.p.remapColumns.length&&(q=b.inArray(q,a.p.remapColumns));q=m[q]}}E=b.jgrid.getAccessor(c,d.root);E==null&&b.isArray(c)&&(E=c);E||(E=[]);c=E.length;o=0;if(c>0&&a.p.page<=0)a.p.page=1;var L=parseInt(a.p.rowNum,10),H=a.p.scroll?b.jgrid.randId():1,J=false,I;f&&(L=L*(f+1));a.p.datatype==="local"&&!a.p.deselectAfterSort&&(J=true);var O=b.isFunction(a.p.afterInsertRow),
N=[],P=false,Q;if(a.p.grouping){P=a.p.groupingView.groupCollapse===true;Q=b.jgrid.getMethod("groupingPrepare")}for(;o<c;){f=E[o];r=b.jgrid.getAccessor(f,q);if(r===void 0){typeof q==="number"&&a.p.colModel[q+s+u+p]!=null&&(r=b.jgrid.getAccessor(f,a.p.colModel[q+s+u+p].name));if(r===void 0){r=H+o;if(m.length===0&&d.cell){y=b.jgrid.getAccessor(f,d.cell)||f;r=y!=null&&y[q]!==void 0?y[q]:r}}}r=a.p.idPrefix+r;y=e===1?0:e;C=(y+o)%2===1?B:"";J&&(I=a.p.multiselect?b.inArray(r,a.p.selarrrow)!==-1:r===a.p.selrow);
var S=K.length;K.push("");p&&K.push(M(0,o,a.p.page,a.p.rowNum));s&&K.push(T(r,p,o,I));u&&K.push(t.call(k,s+p,o+e));v=i;if(d.repeatitems){d.cell&&(f=b.jgrid.getAccessor(f,d.cell)||f);b.isArray(f)&&(v=w)}for(n=0;n<v.length;n++){y=b.jgrid.getAccessor(f,v[n]);x[a.p.colModel[n+s+u+p].name]=y;K.push(A(r,y,n+s+u+p,o+e,f,x))}K[S]=X(r,P,C,x,f,I);K.push("</tr>");if(a.p.grouping){N=Q.call(k,K,N,x,o);K=[]}if(j||a.p.treeGrid===true){x._id_=b.jgrid.stripPref(a.p.idPrefix,r);a.p.data.push(x);a.p._index[x._id_]=
a.p.data.length-1}if(a.p.gridview===false){b("#"+b.jgrid.jqID(a.p.id)+" tbody:first").append(K.join(""));k.triggerHandler("jqGridAfterInsertRow",[r,x,f]);O&&a.p.afterInsertRow.call(a,r,x,f);K=[]}x={};l++;o++;if(l===L)break}if(a.p.gridview===true){D=a.p.treeANode>-1?a.p.treeANode:0;a.p.grouping?k.jqGrid("groupingRender",N,a.p.colModel.length):a.p.treeGrid===true&&D>0?b(a.rows[D]).after(K.join("")):b("#"+b.jgrid.jqID(a.p.id)+" tbody:first").append(K.join(""))}if(a.p.subGrid===true)try{k.jqGrid("addSubGrid",
s+p)}catch(aa){}a.p.totaltime=new Date-h;if(l>0&&a.p.records===0)a.p.records=c;if(a.p.treeGrid===true)try{k.jqGrid("setTreeNode",D+1,l+D+1)}catch(W){}if(!a.p.treeGrid&&!a.p.scroll)a.grid.bDiv.scrollTop=0;a.p.reccount=l;a.p.treeANode=-1;a.p.userDataOnFooter&&k.jqGrid("footerData","set",a.p.userData,true);if(j){a.p.records=c;a.p.lastpage=Math.ceil(c/L)}g||a.updatepager(false,true);if(j)for(;l<c&&E[l];){f=E[l];r=b.jgrid.getAccessor(f,q);if(r===void 0){typeof q==="number"&&a.p.colModel[q+s+u+p]!=null&&
(r=b.jgrid.getAccessor(f,a.p.colModel[q+s+u+p].name));if(r===void 0){r=H+l;if(m.length===0&&d.cell){e=b.jgrid.getAccessor(f,d.cell)||f;r=e!=null&&e[q]!==void 0?e[q]:r}}}if(f){r=a.p.idPrefix+r;v=i;if(d.repeatitems){d.cell&&(f=b.jgrid.getAccessor(f,d.cell)||f);b.isArray(f)&&(v=w)}for(n=0;n<v.length;n++)x[a.p.colModel[n+s+u+p].name]=b.jgrid.getAccessor(f,v[n]);x._id_=b.jgrid.stripPref(a.p.idPrefix,r);a.p.data.push(x);a.p._index[x._id_]=a.p.data.length-1;x={}}l++}}},ja=function(){function c(a){var b=
0,d,e,g,h,i;if(a.groups!=null){(e=a.groups.length&&a.groupOp.toString().toUpperCase()==="OR")&&s.orBegin();for(d=0;d<a.groups.length;d++){b>0&&e&&s.or();try{c(a.groups[d])}catch(j){alert(j)}b++}e&&s.orEnd()}if(a.rules!=null)try{(g=a.rules.length&&a.groupOp.toString().toUpperCase()==="OR")&&s.orBegin();for(d=0;d<a.rules.length;d++){i=a.rules[d];h=a.groupOp.toString().toUpperCase();if(p[i.op]&&i.field){b>0&&h&&h==="OR"&&(s=s.or());s=p[i.op](s,h)(i.field,i.data,f[i.field])}b++}g&&s.orEnd()}catch(qa){alert(qa)}}
var d=a.p.multiSort?[]:"",e=[],g=false,f={},h=[],i=[],j,k,l;if(b.isArray(a.p.data)){var o=a.p.grouping?a.p.groupingView:false,n,m;b.each(a.p.colModel,function(){k=this.sorttype||"text";if(k==="date"||k==="datetime"){if(this.formatter&&typeof this.formatter==="string"&&this.formatter==="date"){j=this.formatoptions&&this.formatoptions.srcformat?this.formatoptions.srcformat:b.jgrid.formatter.date.srcformat;l=this.formatoptions&&this.formatoptions.newformat?this.formatoptions.newformat:b.jgrid.formatter.date.newformat}else j=
l=this.datefmt||"Y-m-d";f[this.name]={stype:k,srcfmt:j,newfmt:l}}else f[this.name]={stype:k,srcfmt:"",newfmt:""};if(a.p.grouping){m=0;for(n=o.groupField.length;m<n;m++)if(this.name===o.groupField[m]){var c=this.name;if(this.index)c=this.index;h[m]=f[c];i[m]=c}}if(a.p.multiSort){if(this.lso){d.push(this.name);c=this.lso.split("-");e.push(c[c.length-1])}}else if(!g&&(this.index===a.p.sortname||this.name===a.p.sortname)){d=this.name;g=true}});if(a.p.treeGrid)b(a).jqGrid("SortTree",d,a.p.sortorder,f[d].stype,
f[d].srcfmt);else{var p={eq:function(a){return a.equals},ne:function(a){return a.notEquals},lt:function(a){return a.less},le:function(a){return a.lessOrEquals},gt:function(a){return a.greater},ge:function(a){return a.greaterOrEquals},cn:function(a){return a.contains},nc:function(a,b){return b==="OR"?a.orNot().contains:a.andNot().contains},bw:function(a){return a.startsWith},bn:function(a,b){return b==="OR"?a.orNot().startsWith:a.andNot().startsWith},en:function(a,b){return b==="OR"?a.orNot().endsWith:
a.andNot().endsWith},ew:function(a){return a.endsWith},ni:function(a,b){return b==="OR"?a.orNot().equals:a.andNot().equals},"in":function(a){return a.equals},nu:function(a){return a.isNull},nn:function(a,b){return b==="OR"?a.orNot().isNull:a.andNot().isNull}},s=b.jgrid.from(a.p.data);a.p.ignoreCase&&(s=s.ignoreCase());if(a.p.search===true){var u=a.p.postData.filters;if(u){typeof u==="string"&&(u=b.jgrid.parse(u));c(u)}else try{s=p[a.p.postData.searchOper](s)(a.p.postData.searchField,a.p.postData.searchString,
f[a.p.postData.searchField])}catch(t){}}if(a.p.grouping)for(m=0;m<n;m++)s.orderBy(i[m],o.groupOrder[m],h[m].stype,h[m].srcfmt);a.p.multiSort?b.each(d,function(a){s.orderBy(this,e[a],f[this].stype,f[this].srcfmt)}):d&&a.p.sortorder&&g&&(a.p.sortorder.toUpperCase()==="DESC"?s.orderBy(a.p.sortname,"d",f[d].stype,f[d].srcfmt):s.orderBy(a.p.sortname,"a",f[d].stype,f[d].srcfmt));var u=s.select(),v=parseInt(a.p.rowNum,10),w=u.length,A=parseInt(a.p.page,10),B=Math.ceil(w/v),q={},u=u.slice((A-1)*v,A*v),f=
s=null;q[a.p.localReader.total]=B;q[a.p.localReader.page]=A;q[a.p.localReader.records]=w;q[a.p.localReader.root]=u;q[a.p.localReader.userdata]=a.p.userData;u=null;return q}}},aa=function(){a.grid.hDiv.loading=true;if(!a.p.hiddengrid)switch(a.p.loadui){case "enable":b("#load_"+b.jgrid.jqID(a.p.id)).show();break;case "block":b("#lui_"+b.jgrid.jqID(a.p.id)).show();b("#load_"+b.jgrid.jqID(a.p.id)).show()}},P=function(){a.grid.hDiv.loading=false;switch(a.p.loadui){case "enable":b("#load_"+b.jgrid.jqID(a.p.id)).hide();
break;case "block":b("#lui_"+b.jgrid.jqID(a.p.id)).hide();b("#load_"+b.jgrid.jqID(a.p.id)).hide()}},O=function(c){if(!a.grid.hDiv.loading){var d=a.p.scroll&&c===false,e={},g,f=a.p.prmNames;if(a.p.page<=0)a.p.page=1;if(f.search!==null)e[f.search]=a.p.search;f.nd!==null&&(e[f.nd]=(new Date).getTime());if(f.rows!==null)e[f.rows]=a.p.rowNum;if(f.page!==null)e[f.page]=a.p.page;if(f.sort!==null)e[f.sort]=a.p.sortname;if(f.order!==null)e[f.order]=a.p.sortorder;if(a.p.rowTotal!==null&&f.totalrows!==null)e[f.totalrows]=
a.p.rowTotal;var h=b.isFunction(a.p.loadComplete),i=h?a.p.loadComplete:null,j=0,c=c||1;if(c>1)if(f.npage!==null){e[f.npage]=c;j=c-1;c=1}else i=function(b){a.p.page++;a.grid.hDiv.loading=false;h&&a.p.loadComplete.call(a,b);O(c-1)};else f.npage!==null&&delete a.p.postData[f.npage];if(a.p.grouping){b(a).jqGrid("groupingSetup");var k=a.p.groupingView,l,o="";for(l=0;l<k.groupField.length;l++){var m=k.groupField[l];b.each(a.p.colModel,function(a,b){if(b.name===m&&b.index)m=b.index});o=o+(m+" "+k.groupOrder[l]+
", ")}e[f.sort]=o+e[f.sort]}b.extend(a.p.postData,e);var n=!a.p.scroll?1:a.rows.length-1,e=b(a).triggerHandler("jqGridBeforeRequest");if(!(e===false||e==="stop"))if(b.isFunction(a.p.datatype))a.p.datatype.call(a,a.p.postData,"load_"+a.p.id);else{if(b.isFunction(a.p.beforeRequest)){e=a.p.beforeRequest.call(a);e===void 0&&(e=true);if(e===false)return}g=a.p.datatype.toLowerCase();switch(g){case "json":case "jsonp":case "xml":case "script":b.ajax(b.extend({url:a.p.url,type:a.p.mtype,dataType:g,data:b.isFunction(a.p.serializeGridData)?
a.p.serializeGridData.call(a,a.p.postData):a.p.postData,success:function(e,f,h){if(b.isFunction(a.p.beforeProcessing)&&a.p.beforeProcessing.call(a,e,f,h)===false)P();else{g==="xml"?J(e,a.grid.bDiv,n,c>1,j):S(e,a.grid.bDiv,n,c>1,j);b(a).triggerHandler("jqGridLoadComplete",[e]);i&&i.call(a,e);b(a).triggerHandler("jqGridAfterLoadComplete",[e]);d&&a.grid.populateVisible();if(a.p.loadonce||a.p.treeGrid)a.p.datatype="local";c===1&&P()}},error:function(d,e,f){b.isFunction(a.p.loadError)&&a.p.loadError.call(a,
d,e,f);c===1&&P()},beforeSend:function(c,d){var e=true;b.isFunction(a.p.loadBeforeSend)&&(e=a.p.loadBeforeSend.call(a,c,d));e===void 0&&(e=true);if(e===false)return false;aa()}},b.jgrid.ajaxOptions,a.p.ajaxGridOptions));break;case "xmlstring":aa();e=typeof a.p.datastr!=="string"?a.p.datastr:b.parseXML(a.p.datastr);J(e,a.grid.bDiv);b(a).triggerHandler("jqGridLoadComplete",[e]);h&&a.p.loadComplete.call(a,e);b(a).triggerHandler("jqGridAfterLoadComplete",[e]);a.p.datatype="local";a.p.datastr=null;P();
break;case "jsonstring":aa();e=typeof a.p.datastr==="string"?b.jgrid.parse(a.p.datastr):a.p.datastr;S(e,a.grid.bDiv);b(a).triggerHandler("jqGridLoadComplete",[e]);h&&a.p.loadComplete.call(a,e);b(a).triggerHandler("jqGridAfterLoadComplete",[e]);a.p.datatype="local";a.p.datastr=null;P();break;case "local":case "clientside":aa();a.p.datatype="local";e=ja();S(e,a.grid.bDiv,n,c>1,j);b(a).triggerHandler("jqGridLoadComplete",[e]);i&&i.call(a,e);b(a).triggerHandler("jqGridAfterLoadComplete",[e]);d&&a.grid.populateVisible();
P()}}}},ca=function(c){b("#cb_"+b.jgrid.jqID(a.p.id),a.grid.hDiv)[a.p.useProp?"prop":"attr"]("checked",c);if(a.p.frozenColumns&&a.p.id+"_frozen")b("#cb_"+b.jgrid.jqID(a.p.id),a.grid.fhDiv)[a.p.useProp?"prop":"attr"]("checked",c)},ka=function(c,d){var e="",g="<table cellspacing='0' cellpadding='0' border='0' style='table-layout:auto;' class='ui-pg-table'><tbody><tr>",i="",j,k,l,m,n=function(c){var d;b.isFunction(a.p.onPaging)&&(d=a.p.onPaging.call(a,c));a.p.selrow=null;if(a.p.multiselect){a.p.selarrrow=
[];ca(false)}a.p.savedRow=[];return d==="stop"?false:true},c=c.substr(1),d=d+("_"+c);j="pg_"+c;k=c+"_left";l=c+"_center";m=c+"_right";b("#"+b.jgrid.jqID(c)).append("<div id='"+j+"' class='ui-pager-control' role='group'><table cellspacing='0' cellpadding='0' border='0' class='ui-pg-table' style='width:100%;table-layout:fixed;height:100%;' role='row'><tbody><tr><td id='"+k+"' align='left'></td><td id='"+l+"' align='center' style='white-space:pre;'></td><td id='"+m+"' align='right'></td></tr></tbody></table></div>").attr("dir",
"ltr");if(a.p.rowList.length>0){i="<td dir='"+f+"'>";i=i+"<select class='ui-pg-selbox' role='listbox'>";for(k=0;k<a.p.rowList.length;k++)i=i+('<option role="option" value="'+a.p.rowList[k]+'"'+(a.p.rowNum===a.p.rowList[k]?' selected="selected"':"")+">"+a.p.rowList[k]+"</option>");i=i+"</select></td>"}f==="rtl"&&(g=g+i);a.p.pginput===true&&(e="<td dir='"+f+"'>"+b.jgrid.format(a.p.pgtext||"","<input class='ui-pg-input' type='text' size='2' maxlength='7' value='0' role='textbox'/>","<span id='sp_1_"+
b.jgrid.jqID(c)+"'></span>")+"</td>");if(a.p.pgbuttons===true){k=["first"+d,"prev"+d,"next"+d,"last"+d];f==="rtl"&&k.reverse();g=g+("<td id='"+k[0]+"' class='ui-pg-button ui-corner-all'><span class='ui-icon ui-icon-seek-first'></span></td>");g=g+("<td id='"+k[1]+"' class='ui-pg-button ui-corner-all'><span class='ui-icon ui-icon-seek-prev'></span></td>");g=g+(e!==""?"<td class='ui-pg-button ui-state-disabled' style='width:4px;'><span class='ui-separator'></span></td>"+e+"<td class='ui-pg-button ui-state-disabled' style='width:4px;'><span class='ui-separator'></span></td>":
"")+("<td id='"+k[2]+"' class='ui-pg-button ui-corner-all'><span class='ui-icon ui-icon-seek-next'></span></td>");g=g+("<td id='"+k[3]+"' class='ui-pg-button ui-corner-all'><span class='ui-icon ui-icon-seek-end'></span></td>")}else e!==""&&(g=g+e);f==="ltr"&&(g=g+i);g=g+"</tr></tbody></table>";a.p.viewrecords===true&&b("td#"+c+"_"+a.p.recordpos,"#"+j).append("<div dir='"+f+"' style='text-align:"+a.p.recordpos+"' class='ui-paging-info'></div>");b("td#"+c+"_"+a.p.pagerpos,"#"+j).append(g);i=b(".ui-jqgrid").css("font-size")||
"11px";b(document.body).append("<div id='testpg' class='ui-jqgrid ui-widget ui-widget-content' style='font-size:"+i+";visibility:hidden;' ></div>");g=b(g).clone().appendTo("#testpg").width();b("#testpg").remove();if(g>0){e!==""&&(g=g+50);b("td#"+c+"_"+a.p.pagerpos,"#"+j).width(g)}a.p._nvtd=[];a.p._nvtd[0]=g?Math.floor((a.p.width-g)/2):Math.floor(a.p.width/3);a.p._nvtd[1]=0;g=null;b(".ui-pg-selbox","#"+j).bind("change",function(){if(!n("records"))return false;a.p.page=Math.round(a.p.rowNum*(a.p.page-
1)/this.value-0.5)+1;a.p.rowNum=this.value;a.p.pager&&b(".ui-pg-selbox",a.p.pager).val(this.value);a.p.toppager&&b(".ui-pg-selbox",a.p.toppager).val(this.value);O();return false});if(a.p.pgbuttons===true){b(".ui-pg-button","#"+j).hover(function(){if(b(this).hasClass("ui-state-disabled"))this.style.cursor="default";else{b(this).addClass("ui-state-hover");this.style.cursor="pointer"}},function(){if(!b(this).hasClass("ui-state-disabled")){b(this).removeClass("ui-state-hover");this.style.cursor="default"}});
b("#first"+b.jgrid.jqID(d)+", #prev"+b.jgrid.jqID(d)+", #next"+b.jgrid.jqID(d)+", #last"+b.jgrid.jqID(d)).click(function(){var b=o(a.p.page,1),c=o(a.p.lastpage,1),e=false,g=true,f=true,h=true,i=true;if(c===0||c===1)i=h=f=g=false;else if(c>1&&b>=1)if(b===1)f=g=false;else{if(b===c)i=h=false}else if(c>1&&b===0){i=h=false;b=c-1}if(!n(this.id))return false;if(this.id==="first"+d&&g){a.p.page=1;e=true}if(this.id==="prev"+d&&f){a.p.page=b-1;e=true}if(this.id==="next"+d&&h){a.p.page=b+1;e=true}if(this.id===
"last"+d&&i){a.p.page=c;e=true}e&&O();return false})}a.p.pginput===true&&b("input.ui-pg-input","#"+j).keypress(function(c){if((c.charCode||c.keyCode||0)===13){if(!n("user"))return false;b(this).val(o(b(this).val(),1));a.p.page=b(this).val()>0?b(this).val():a.p.page;O();return false}return this})},ra=function(c,d){var e,g="",f=a.p.colModel,h=false,i;i=a.p.frozenColumns?d:a.grid.headers[c].el;var j="";b("span.ui-grid-ico-sort",i).addClass("ui-state-disabled");b(i).attr("aria-selected","false");if(f[c].lso)if(f[c].lso===
"asc"){f[c].lso=f[c].lso+"-desc";j="desc"}else if(f[c].lso==="desc"){f[c].lso=f[c].lso+"-asc";j="asc"}else{if(f[c].lso==="asc-desc"||f[c].lso==="desc-asc")f[c].lso=""}else f[c].lso=j=f.firstsortorder||"asc";if(j){b("span.s-ico",i).show();b("span.ui-icon-"+j,i).removeClass("ui-state-disabled");b(i).attr("aria-selected","true")}else a.p.viewsortcols[0]||b("span.s-ico",i).hide();a.p.sortorder="";b.each(f,function(b){if(this.lso){b>0&&h&&(g=g+", ");e=this.lso.split("-");g=g+(f[b].index||f[b].name);g=
g+(" "+e[e.length-1]);h=true;a.p.sortorder=e[e.length-1]}});i=g.lastIndexOf(a.p.sortorder);g=g.substring(0,i);a.p.sortname=g},la=function(c,d,e,g,f){if(a.p.colModel[d].sortable){var h;if(!(a.p.savedRow.length>0)){if(!e){if(a.p.lastsort===d)if(a.p.sortorder==="asc")a.p.sortorder="desc";else{if(a.p.sortorder==="desc")a.p.sortorder="asc"}else a.p.sortorder=a.p.colModel[d].firstsortorder||"asc";a.p.page=1}if(a.p.multiSort)ra(d,f);else{if(g){if(a.p.lastsort===d&&a.p.sortorder===g&&!e)return;a.p.sortorder=
g}e=a.grid.headers[a.p.lastsort].el;f=a.p.frozenColumns?f:a.grid.headers[d].el;b("span.ui-grid-ico-sort",e).addClass("ui-state-disabled");b(e).attr("aria-selected","false");if(a.p.frozenColumns){a.grid.fhDiv.find("span.ui-grid-ico-sort").addClass("ui-state-disabled");a.grid.fhDiv.find("th").attr("aria-selected","false")}b("span.ui-icon-"+a.p.sortorder,f).removeClass("ui-state-disabled");b(f).attr("aria-selected","true");if(!a.p.viewsortcols[0]&&a.p.lastsort!==d){a.p.frozenColumns&&a.grid.fhDiv.find("span.s-ico").hide();
b("span.s-ico",e).hide();b("span.s-ico",f).show()}c=c.substring(5+a.p.id.length+1);a.p.sortname=a.p.colModel[d].index||c;h=a.p.sortorder}if(b(a).triggerHandler("jqGridSortCol",[c,d,h])==="stop")a.p.lastsort=d;else if(b.isFunction(a.p.onSortCol)&&a.p.onSortCol.call(a,c,d,h)==="stop")a.p.lastsort=d;else{if(a.p.datatype==="local")a.p.deselectAfterSort&&b(a).jqGrid("resetSelection");else{a.p.selrow=null;a.p.multiselect&&ca(false);a.p.selarrrow=[];a.p.savedRow=[]}if(a.p.scroll){f=a.grid.bDiv.scrollLeft;
V.call(a,true,false);a.grid.hDiv.scrollLeft=f}a.p.subGrid&&a.p.datatype==="local"&&b("td.sgexpanded","#"+b.jgrid.jqID(a.p.id)).each(function(){b(this).trigger("click")});O();a.p.lastsort=d;if(a.p.sortname!==c&&d)a.p.lastsort=d}}}},sa=function(c){c=b(a.grid.headers[c].el);c=[c.position().left+c.outerWidth()];a.p.direction==="rtl"&&(c[0]=a.p.width-c[0]);c[0]=c[0]-a.grid.bDiv.scrollLeft;c.push(b(a.grid.hDiv).position().top);c.push(b(a.grid.bDiv).offset().top-b(a.grid.hDiv).offset().top+b(a.grid.bDiv).height());
return c},ma=function(c){var d,e=a.grid.headers,g=b.jgrid.getCellIndex(c);for(d=0;d<e.length;d++)if(c===e[d].el){g=d;break}return g};this.p.id=this.id;-1===b.inArray(a.p.multikey,["shiftKey","altKey","ctrlKey"])&&(a.p.multikey=!1);a.p.keyIndex=!1;for(g=0;g<a.p.colModel.length;g++)a.p.colModel[g]=b.extend(!0,{},a.p.cmTemplate,a.p.colModel[g].template||{},a.p.colModel[g]),!1===a.p.keyIndex&&!0===a.p.colModel[g].key&&(a.p.keyIndex=g);a.p.sortorder=a.p.sortorder.toLowerCase();b.jgrid.cell_width=b.jgrid.cellWidth();
!0===a.p.grouping&&(a.p.scroll=!1,a.p.rownumbers=!1,a.p.treeGrid=!1,a.p.gridview=!0);if(!0===this.p.treeGrid){try{b(this).jqGrid("setTreeGrid")}catch(va){}"local"!==a.p.datatype&&(a.p.localReader={id:"_id_"})}if(this.p.subGrid)try{b(a).jqGrid("setSubGrid")}catch(wa){}this.p.multiselect&&(this.p.colNames.unshift("<input role='checkbox' id='cb_"+this.p.id+"' class='cbox' type='checkbox'/>"),this.p.colModel.unshift({name:"cb",width:b.jgrid.cell_width?a.p.multiselectWidth+a.p.cellLayout:a.p.multiselectWidth,
sortable:!1,resizable:!1,hidedlg:!0,search:!1,align:"center",fixed:!0}));this.p.rownumbers&&(this.p.colNames.unshift(""),this.p.colModel.unshift({name:"rn",width:a.p.rownumWidth,sortable:!1,resizable:!1,hidedlg:!0,search:!1,align:"center",fixed:!0}));a.p.xmlReader=b.extend(!0,{root:"rows",row:"row",page:"rows>page",total:"rows>total",records:"rows>records",repeatitems:!0,cell:"cell",id:"[id]",userdata:"userdata",subgrid:{root:"rows",row:"row",repeatitems:!0,cell:"cell"}},a.p.xmlReader);a.p.jsonReader=
b.extend(!0,{root:"rows",page:"page",total:"total",records:"records",repeatitems:!0,cell:"cell",id:"id",userdata:"userdata",subgrid:{root:"rows",repeatitems:!0,cell:"cell"}},a.p.jsonReader);a.p.localReader=b.extend(!0,{root:"rows",page:"page",total:"total",records:"records",repeatitems:!1,cell:"cell",id:"id",userdata:"userdata",subgrid:{root:"rows",repeatitems:!0,cell:"cell"}},a.p.localReader);a.p.scroll&&(a.p.pgbuttons=!1,a.p.pginput=!1,a.p.rowList=[]);a.p.data.length&&N();var B="<thead><tr class='ui-jqgrid-labels' role='rowheader'>",
na,C,da,ea,fa,v,p,W,oa=W="",ba=[],pa=[];C=[];if(!0===a.p.shrinkToFit&&!0===a.p.forceFit)for(g=a.p.colModel.length-1;0<=g;g--)if(!a.p.colModel[g].hidden){a.p.colModel[g].resizable=!1;break}"horizontal"===a.p.viewsortcols[1]&&(W=" ui-i-asc",oa=" ui-i-desc");na=k?"class='ui-th-div-ie'":"";W="<span class='s-ico' style='display:none'><span sort='asc' class='ui-grid-ico-sort ui-icon-asc"+W+" ui-state-disabled ui-icon ui-icon-triangle-1-n ui-sort-"+f+"'></span>"+("<span sort='desc' class='ui-grid-ico-sort ui-icon-desc"+
oa+" ui-state-disabled ui-icon ui-icon-triangle-1-s ui-sort-"+f+"'></span></span>");if(a.p.multiSort){ba=a.p.sortname.split(",");for(g=0;g<ba.length;g++)C=b.trim(ba[g]).split(" "),ba[g]=b.trim(C[0]),pa[g]=C[1]?b.trim(C[1]):a.p.sortorder||"asc"}for(g=0;g<this.p.colNames.length;g++)C=a.p.headertitles?' title="'+b.jgrid.stripHtml(a.p.colNames[g])+'"':"",B+="<th id='"+a.p.id+"_"+a.p.colModel[g].name+"' role='columnheader' class='ui-state-default ui-th-column ui-th-"+f+"'"+C+">",C=a.p.colModel[g].index||
a.p.colModel[g].name,B+="<div id='jqgh_"+a.p.id+"_"+a.p.colModel[g].name+"' "+na+">"+a.p.colNames[g],a.p.colModel[g].width=a.p.colModel[g].width?parseInt(a.p.colModel[g].width,10):150,"boolean"!==typeof a.p.colModel[g].title&&(a.p.colModel[g].title=!0),a.p.colModel[g].lso="",C===a.p.sortname&&(a.p.lastsort=g),a.p.multiSort&&(C=b.inArray(C,ba),-1!==C&&(a.p.colModel[g].lso=pa[C])),B+=W+"</div></th>";W=null;b(this).append(B+"</tr></thead>");b("thead tr:first th",this).hover(function(){b(this).addClass("ui-state-hover")},
function(){b(this).removeClass("ui-state-hover")});if(this.p.multiselect){var ga=[],Y;b("#cb_"+b.jgrid.jqID(a.p.id),this).bind("click",function(){a.p.selarrrow=[];var c=a.p.frozenColumns===true?a.p.id+"_frozen":"";if(this.checked){b(a.rows).each(function(d){if(d>0&&!b(this).hasClass("ui-subgrid")&&!b(this).hasClass("jqgroup")&&!b(this).hasClass("ui-state-disabled")){b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+b.jgrid.jqID(this.id))[a.p.useProp?"prop":"attr"]("checked",true);b(this).addClass("ui-state-highlight").attr("aria-selected",
"true");a.p.selarrrow.push(this.id);a.p.selrow=this.id;if(c){b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+b.jgrid.jqID(this.id),a.grid.fbDiv)[a.p.useProp?"prop":"attr"]("checked",true);b("#"+b.jgrid.jqID(this.id),a.grid.fbDiv).addClass("ui-state-highlight")}}});Y=true;ga=[]}else{b(a.rows).each(function(d){if(d>0&&!b(this).hasClass("ui-subgrid")&&!b(this).hasClass("ui-state-disabled")){b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+b.jgrid.jqID(this.id))[a.p.useProp?"prop":"attr"]("checked",false);b(this).removeClass("ui-state-highlight").attr("aria-selected",
"false");ga.push(this.id);if(c){b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+b.jgrid.jqID(this.id),a.grid.fbDiv)[a.p.useProp?"prop":"attr"]("checked",false);b("#"+b.jgrid.jqID(this.id),a.grid.fbDiv).removeClass("ui-state-highlight")}}});a.p.selrow=null;Y=false}b(a).triggerHandler("jqGridSelectAll",[Y?a.p.selarrrow:ga,Y]);b.isFunction(a.p.onSelectAll)&&a.p.onSelectAll.call(a,Y?a.p.selarrrow:ga,Y)})}!0===a.p.autowidth&&(B=b(l).innerWidth(),a.p.width=0<B?B:"nw");(function(){var d=0,e=b.jgrid.cell_width?0:o(a.p.cellLayout,
0),g=0,f,h=o(a.p.scrollOffset,0),i,k=false,l,m=0,n;b.each(a.p.colModel,function(){if(this.hidden===void 0)this.hidden=false;if(a.p.grouping&&a.p.autowidth){var c=b.inArray(this.name,a.p.groupingView.groupField);if(c>=0&&a.p.groupingView.groupColumnShow.length>c)this.hidden=!a.p.groupingView.groupColumnShow[c]}this.widthOrg=i=o(this.width,0);if(this.hidden===false){d=d+(i+e);this.fixed?m=m+(i+e):g++}});if(isNaN(a.p.width))a.p.width=d+(a.p.shrinkToFit===false&&!isNaN(a.p.height)?h:0);c.width=a.p.width;
a.p.tblwidth=d;if(a.p.shrinkToFit===false&&a.p.forceFit===true)a.p.forceFit=false;if(a.p.shrinkToFit===true&&g>0){l=c.width-e*g-m;if(!isNaN(a.p.height)){l=l-h;k=true}d=0;b.each(a.p.colModel,function(b){if(this.hidden===false&&!this.fixed){this.width=i=Math.round(l*this.width/(a.p.tblwidth-e*g-m));d=d+i;f=b}});n=0;k?c.width-m-(d+e*g)!==h&&(n=c.width-m-(d+e*g)-h):!k&&Math.abs(c.width-m-(d+e*g))!==1&&(n=c.width-m-(d+e*g));a.p.colModel[f].width=a.p.colModel[f].width+n;a.p.tblwidth=d+n+e*g+m;if(a.p.tblwidth>
a.p.width){a.p.colModel[f].width=a.p.colModel[f].width-(a.p.tblwidth-parseInt(a.p.width,10));a.p.tblwidth=a.p.width}}})();b(l).css("width",c.width+"px").append("<div class='ui-jqgrid-resize-mark' id='rs_m"+a.p.id+"'>&#160;</div>");b(i).css("width",c.width+"px");var B=b("thead:first",a).get(0),Q="";a.p.footerrow&&(Q+="<table role='grid' style='width:"+a.p.tblwidth+"px' class='ui-jqgrid-ftable' cellspacing='0' cellpadding='0' border='0'><tbody><tr role='row' class='ui-widget-content footrow footrow-"+
f+"'>");var i=b("tr:first",B),Z="<tr class='jqgfirstrow' role='row' style='height:auto'>";a.p.disableClick=!1;b("th",i).each(function(d){da=a.p.colModel[d].width;if(a.p.colModel[d].resizable===void 0)a.p.colModel[d].resizable=true;if(a.p.colModel[d].resizable){ea=document.createElement("span");b(ea).html("&#160;").addClass("ui-jqgrid-resize ui-jqgrid-resize-"+f).css("cursor","col-resize");b(this).addClass(a.p.resizeclass)}else ea="";b(this).css("width",da+"px").prepend(ea);var e="";if(a.p.colModel[d].hidden){b(this).css("display",
"none");e="display:none;"}Z=Z+("<td role='gridcell' style='height:0px;width:"+da+"px;"+e+"'></td>");c.headers[d]={width:da,el:this};fa=a.p.colModel[d].sortable;if(typeof fa!=="boolean")fa=a.p.colModel[d].sortable=true;e=a.p.colModel[d].name;e==="cb"||e==="subgrid"||e==="rn"||a.p.viewsortcols[2]&&b(">div",this).addClass("ui-jqgrid-sortable");if(fa)if(a.p.multiSort)if(a.p.viewsortcols[0]){b("div span.s-ico",this).show();a.p.colModel[d].lso&&b("div span.ui-icon-"+a.p.colModel[d].lso,this).removeClass("ui-state-disabled")}else{if(a.p.colModel[d].lso){b("div span.s-ico",
this).show();b("div span.ui-icon-"+a.p.colModel[d].lso,this).removeClass("ui-state-disabled")}}else if(a.p.viewsortcols[0]){b("div span.s-ico",this).show();d===a.p.lastsort&&b("div span.ui-icon-"+a.p.sortorder,this).removeClass("ui-state-disabled")}else if(d===a.p.lastsort){b("div span.s-ico",this).show();b("div span.ui-icon-"+a.p.sortorder,this).removeClass("ui-state-disabled")}a.p.footerrow&&(Q=Q+("<td role='gridcell' "+n(d,0,"",null,"",false)+">&#160;</td>"))}).mousedown(function(d){if(b(d.target).closest("th>span.ui-jqgrid-resize").length===
1){var e=ma(this);if(a.p.forceFit===true){var g=a.p,f=e,h;for(h=e+1;h<a.p.colModel.length;h++)if(a.p.colModel[h].hidden!==true){f=h;break}g.nv=f-e}c.dragStart(e,d,sa(e));return false}}).click(function(c){if(a.p.disableClick)return a.p.disableClick=false;var d="th>div.ui-jqgrid-sortable",e,g;a.p.viewsortcols[2]||(d="th>div>span>span.ui-grid-ico-sort");c=b(c.target).closest(d);if(c.length===1){var f;if(a.p.frozenColumns){var h=b(this)[0].id.substring(5);b(a.p.colModel).each(function(a){if(this.name===
h){f=a;return false}})}else f=ma(this);if(!a.p.viewsortcols[2]){e=true;g=c.attr("sort")}f!=null&&la(b("div",this)[0].id,f,e,g,this);return false}});if(a.p.sortable&&b.fn.sortable)try{b(a).jqGrid("sortableColumns",i)}catch(xa){}a.p.footerrow&&(Q+="</tr></tbody></table>");Z+="</tr>";this.appendChild(document.createElement("tbody"));b(this).addClass("ui-jqgrid-btable").append(Z);var Z=null,i=b("<table class='ui-jqgrid-htable' style='width:"+a.p.tblwidth+"px' role='grid' aria-labelledby='gbox_"+this.id+
"' cellspacing='0' cellpadding='0' border='0'></table>").append(B),H=a.p.caption&&!0===a.p.hiddengrid?!0:!1;g=b("<div class='ui-jqgrid-hbox"+("rtl"===f?"-rtl":"")+"'></div>");B=null;c.hDiv=document.createElement("div");b(c.hDiv).css({width:c.width+"px"}).addClass("ui-state-default ui-jqgrid-hdiv").append(g);b(g).append(i);i=null;H&&b(c.hDiv).hide();a.p.pager&&("string"===typeof a.p.pager?"#"!==a.p.pager.substr(0,1)&&(a.p.pager="#"+a.p.pager):a.p.pager="#"+b(a.p.pager).attr("id"),b(a.p.pager).css({width:c.width+
"px"}).addClass("ui-state-default ui-jqgrid-pager ui-corner-bottom").appendTo(l),H&&b(a.p.pager).hide(),ka(a.p.pager,""));!1===a.p.cellEdit&&!0===a.p.hoverrows&&b(a).bind("mouseover",function(a){p=b(a.target).closest("tr.jqgrow");b(p).attr("class")!=="ui-subgrid"&&b(p).addClass("ui-state-hover")}).bind("mouseout",function(a){p=b(a.target).closest("tr.jqgrow");b(p).removeClass("ui-state-hover")});var w,I,ha;b(a).before(c.hDiv).click(function(c){v=c.target;p=b(v,a.rows).closest("tr.jqgrow");if(b(p).length===
0||p[0].className.indexOf("ui-state-disabled")>-1||(b(v,a).closest("table.ui-jqgrid-btable").attr("id")||"").replace("_frozen","")!==a.id)return this;var d=b(v).hasClass("cbox"),e=b(a).triggerHandler("jqGridBeforeSelectRow",[p[0].id,c]);(e=e===false||e==="stop"?false:true)&&b.isFunction(a.p.beforeSelectRow)&&(e=a.p.beforeSelectRow.call(a,p[0].id,c));if(!(v.tagName==="A"||(v.tagName==="INPUT"||v.tagName==="TEXTAREA"||v.tagName==="OPTION"||v.tagName==="SELECT")&&!d)&&e===true){w=p[0].id;I=b.jgrid.getCellIndex(v);
ha=b(v).closest("td,th").html();b(a).triggerHandler("jqGridCellSelect",[w,I,ha,c]);b.isFunction(a.p.onCellSelect)&&a.p.onCellSelect.call(a,w,I,ha,c);if(a.p.cellEdit===true)if(a.p.multiselect&&d)b(a).jqGrid("setSelection",w,true,c);else{w=p[0].rowIndex;try{b(a).jqGrid("editCell",w,I,true)}catch(g){}}else if(a.p.multikey)if(c[a.p.multikey])b(a).jqGrid("setSelection",w,true,c);else{if(a.p.multiselect&&d){d=b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+w).is(":checked");b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+w)[a.p.useProp?
"prop":"attr"]("checked",d)}}else{if(a.p.multiselect&&a.p.multiboxonly&&!d){var f=a.p.frozenColumns?a.p.id+"_frozen":"";b(a.p.selarrrow).each(function(c,d){var e=a.rows.namedItem(d);b(e).removeClass("ui-state-highlight");b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+b.jgrid.jqID(d))[a.p.useProp?"prop":"attr"]("checked",false);if(f){b("#"+b.jgrid.jqID(d),"#"+b.jgrid.jqID(f)).removeClass("ui-state-highlight");b("#jqg_"+b.jgrid.jqID(a.p.id)+"_"+b.jgrid.jqID(d),"#"+b.jgrid.jqID(f))[a.p.useProp?"prop":"attr"]("checked",
false)}});a.p.selarrrow=[]}b(a).jqGrid("setSelection",w,true,c)}}}).bind("reloadGrid",function(c,d){if(a.p.treeGrid===true)a.p.datatype=a.p.treedatatype;d&&d.current&&a.grid.selectionPreserver(a);if(a.p.datatype==="local"){b(a).jqGrid("resetSelection");a.p.data.length&&N()}else if(!a.p.treeGrid){a.p.selrow=null;if(a.p.multiselect){a.p.selarrrow=[];ca(false)}a.p.savedRow=[]}a.p.scroll&&V.call(a,true,false);if(d&&d.page){var e=d.page;if(e>a.p.lastpage)e=a.p.lastpage;e<1&&(e=1);a.p.page=e;a.grid.bDiv.scrollTop=
a.grid.prevRowHeight?(e-1)*a.grid.prevRowHeight*a.p.rowNum:0}if(a.grid.prevRowHeight&&a.p.scroll){delete a.p.lastpage;a.grid.populateVisible()}else a.grid.populate();a.p._inlinenav===true&&b(a).jqGrid("showAddEditButtons");return false}).dblclick(function(c){v=c.target;p=b(v,a.rows).closest("tr.jqgrow");if(b(p).length!==0){w=p[0].rowIndex;I=b.jgrid.getCellIndex(v);b(a).triggerHandler("jqGridDblClickRow",[b(p).attr("id"),w,I,c]);b.isFunction(a.p.ondblClickRow)&&a.p.ondblClickRow.call(a,b(p).attr("id"),
w,I,c)}}).bind("contextmenu",function(c){v=c.target;p=b(v,a.rows).closest("tr.jqgrow");if(b(p).length!==0){a.p.multiselect||b(a).jqGrid("setSelection",p[0].id,true,c);w=p[0].rowIndex;I=b.jgrid.getCellIndex(v);b(a).triggerHandler("jqGridRightClickRow",[b(p).attr("id"),w,I,c]);b.isFunction(a.p.onRightClickRow)&&a.p.onRightClickRow.call(a,b(p).attr("id"),w,I,c)}});c.bDiv=document.createElement("div");k&&"auto"===(""+a.p.height).toLowerCase()&&(a.p.height="100%");b(c.bDiv).append(b('<div style="position:relative;'+
(k&&8>b.jgrid.msiever()?"height:0.01%;":"")+'"></div>').append("<div></div>").append(this)).addClass("ui-jqgrid-bdiv").css({height:a.p.height+(isNaN(a.p.height)?"":"px"),width:c.width+"px"}).scroll(c.scrollGrid);b("table:first",c.bDiv).css({width:a.p.tblwidth+"px"});b.support.tbody||2===b("tbody",this).length&&b("tbody:gt(0)",this).remove();a.p.multikey&&(b.jgrid.msie?b(c.bDiv).bind("selectstart",function(){return false}):b(c.bDiv).bind("mousedown",function(){return false}));H&&b(c.bDiv).hide();c.cDiv=
document.createElement("div");var ia=!0===a.p.hidegrid?b("<a role='link' href='javascript:void(0)'/>").addClass("ui-jqgrid-titlebar-close HeaderButton").hover(function(){ia.addClass("ui-state-hover")},function(){ia.removeClass("ui-state-hover")}).append("<span class='ui-icon ui-icon-circle-triangle-n'></span>").css("rtl"===f?"left":"right","0px"):"";b(c.cDiv).append(ia).append("<span class='ui-jqgrid-title"+("rtl"===f?"-rtl":"")+"'>"+a.p.caption+"</span>").addClass("ui-jqgrid-titlebar ui-widget-header ui-corner-top ui-helper-clearfix");
b(c.cDiv).insertBefore(c.hDiv);a.p.toolbar[0]&&(c.uDiv=document.createElement("div"),"top"===a.p.toolbar[1]?b(c.uDiv).insertBefore(c.hDiv):"bottom"===a.p.toolbar[1]&&b(c.uDiv).insertAfter(c.hDiv),"both"===a.p.toolbar[1]?(c.ubDiv=document.createElement("div"),b(c.uDiv).addClass("ui-userdata ui-state-default").attr("id","t_"+this.id).insertBefore(c.hDiv),b(c.ubDiv).addClass("ui-userdata ui-state-default").attr("id","tb_"+this.id).insertAfter(c.hDiv),H&&b(c.ubDiv).hide()):b(c.uDiv).width(c.width).addClass("ui-userdata ui-state-default").attr("id",
"t_"+this.id),H&&b(c.uDiv).hide());a.p.toppager&&(a.p.toppager=b.jgrid.jqID(a.p.id)+"_toppager",c.topDiv=b("<div id='"+a.p.toppager+"'></div>")[0],a.p.toppager="#"+a.p.toppager,b(c.topDiv).addClass("ui-state-default ui-jqgrid-toppager").width(c.width).insertBefore(c.hDiv),ka(a.p.toppager,"_t"));a.p.footerrow&&(c.sDiv=b("<div class='ui-jqgrid-sdiv'></div>")[0],g=b("<div class='ui-jqgrid-hbox"+("rtl"===f?"-rtl":"")+"'></div>"),b(c.sDiv).append(g).width(c.width).insertAfter(c.hDiv),b(g).append(Q),c.footers=
b(".ui-jqgrid-ftable",c.sDiv)[0].rows[0].cells,a.p.rownumbers&&(c.footers[0].className="ui-state-default jqgrid-rownum"),H&&b(c.sDiv).hide());g=null;if(a.p.caption){var ta=a.p.datatype;!0===a.p.hidegrid&&(b(".ui-jqgrid-titlebar-close",c.cDiv).click(function(d){var e=b.isFunction(a.p.onHeaderClick),g=".ui-jqgrid-bdiv, .ui-jqgrid-hdiv, .ui-jqgrid-pager, .ui-jqgrid-sdiv",f,h=this;if(a.p.toolbar[0]===true){a.p.toolbar[1]==="both"&&(g=g+(", #"+b(c.ubDiv).attr("id")));g=g+(", #"+b(c.uDiv).attr("id"))}f=
b(g,"#gview_"+b.jgrid.jqID(a.p.id)).length;a.p.gridstate==="visible"?b(g,"#gbox_"+b.jgrid.jqID(a.p.id)).slideUp("fast",function(){f--;if(f===0){b("span",h).removeClass("ui-icon-circle-triangle-n").addClass("ui-icon-circle-triangle-s");a.p.gridstate="hidden";b("#gbox_"+b.jgrid.jqID(a.p.id)).hasClass("ui-resizable")&&b(".ui-resizable-handle","#gbox_"+b.jgrid.jqID(a.p.id)).hide();b(a).triggerHandler("jqGridHeaderClick",[a.p.gridstate,d]);e&&(H||a.p.onHeaderClick.call(a,a.p.gridstate,d))}}):a.p.gridstate===
"hidden"&&b(g,"#gbox_"+b.jgrid.jqID(a.p.id)).slideDown("fast",function(){f--;if(f===0){b("span",h).removeClass("ui-icon-circle-triangle-s").addClass("ui-icon-circle-triangle-n");if(H){a.p.datatype=ta;O();H=false}a.p.gridstate="visible";b("#gbox_"+b.jgrid.jqID(a.p.id)).hasClass("ui-resizable")&&b(".ui-resizable-handle","#gbox_"+b.jgrid.jqID(a.p.id)).show();b(a).triggerHandler("jqGridHeaderClick",[a.p.gridstate,d]);e&&(H||a.p.onHeaderClick.call(a,a.p.gridstate,d))}});return false}),H&&(a.p.datatype=
"local",b(".ui-jqgrid-titlebar-close",c.cDiv).trigger("click")))}else b(c.cDiv).hide();b(c.hDiv).after(c.bDiv).mousemove(function(a){if(c.resizing){c.dragMove(a);return false}});b(".ui-jqgrid-labels",c.hDiv).bind("selectstart",function(){return false});b(document).mouseup(function(){if(c.resizing){c.dragEnd();return false}return true});a.formatCol=n;a.sortData=la;a.updatepager=function(c,d){var e,g,f,h,i,j,k,l="",m=a.p.pager?"_"+b.jgrid.jqID(a.p.pager.substr(1)):"",n=a.p.toppager?"_"+a.p.toppager.substr(1):
"";f=parseInt(a.p.page,10)-1;f<0&&(f=0);f=f*parseInt(a.p.rowNum,10);i=f+a.p.reccount;if(a.p.scroll){e=b("tbody:first > tr:gt(0)",a.grid.bDiv);f=i-e.length;a.p.reccount=e.length;if(e=e.outerHeight()||a.grid.prevRowHeight){g=f*e;k=parseInt(a.p.records,10)*e;b(">div:first",a.grid.bDiv).css({height:k}).children("div:first").css({height:g,display:g?"":"none"});if(a.grid.bDiv.scrollTop==0&&a.p.page>1)a.grid.bDiv.scrollTop=a.p.rowNum*(a.p.page-1)*e}a.grid.bDiv.scrollLeft=a.grid.hDiv.scrollLeft}l=a.p.pager||
"";if(l=l+(a.p.toppager?l?","+a.p.toppager:a.p.toppager:"")){k=b.jgrid.formatter.integer||{};e=o(a.p.page);g=o(a.p.lastpage);b(".selbox",l)[this.p.useProp?"prop":"attr"]("disabled",false);if(a.p.pginput===true){b(".ui-pg-input",l).val(a.p.page);h=a.p.toppager?"#sp_1"+m+",#sp_1"+n:"#sp_1"+m;b(h).html(b.fmatter?b.fmatter.util.NumberFormat(a.p.lastpage,k):a.p.lastpage)}if(a.p.viewrecords)if(a.p.reccount===0)b(".ui-paging-info",l).html(a.p.emptyrecords);else{h=f+1;j=a.p.records;if(b.fmatter){h=b.fmatter.util.NumberFormat(h,
k);i=b.fmatter.util.NumberFormat(i,k);j=b.fmatter.util.NumberFormat(j,k)}b(".ui-paging-info",l).html(b.jgrid.format(a.p.recordtext,h,i,j))}if(a.p.pgbuttons===true){e<=0&&(e=g=0);if(e===1||e===0){b("#first"+m+", #prev"+m).addClass("ui-state-disabled").removeClass("ui-state-hover");a.p.toppager&&b("#first_t"+n+", #prev_t"+n).addClass("ui-state-disabled").removeClass("ui-state-hover")}else{b("#first"+m+", #prev"+m).removeClass("ui-state-disabled");a.p.toppager&&b("#first_t"+n+", #prev_t"+n).removeClass("ui-state-disabled")}if(e===
g||e===0){b("#next"+m+", #last"+m).addClass("ui-state-disabled").removeClass("ui-state-hover");a.p.toppager&&b("#next_t"+n+", #last_t"+n).addClass("ui-state-disabled").removeClass("ui-state-hover")}else{b("#next"+m+", #last"+m).removeClass("ui-state-disabled");a.p.toppager&&b("#next_t"+n+", #last_t"+n).removeClass("ui-state-disabled")}}}c===true&&a.p.rownumbers===true&&b(">td.jqgrid-rownum",a.rows).each(function(a){b(this).html(f+1+a)});d&&a.p.jqgdnd&&b(a).jqGrid("gridDnD","updateDnD");b(a).triggerHandler("jqGridGridComplete");
b.isFunction(a.p.gridComplete)&&a.p.gridComplete.call(a);b(a).triggerHandler("jqGridAfterGridComplete")};a.refreshIndex=N;a.setHeadCheckBox=ca;a.constructTr=X;a.formatter=function(a,b,c,d,e){return t(a,b,c,d,e)};b.extend(c,{populate:O,emptyRows:V});this.grid=c;a.addXmlData=function(b){J(b,a.grid.bDiv)};a.addJSONData=function(b){S(b,a.grid.bDiv)};this.grid.cols=this.rows[0].cells;b(a).triggerHandler("jqGridInitGrid");b.isFunction(a.p.onInitGrid)&&a.p.onInitGrid.call(a);O();a.p.hiddengrid=!1}}}})};
b.jgrid.extend({getGridParam:function(b){var f=this[0];return!f||!f.grid?void 0:!b?f.p:void 0!==f.p[b]?f.p[b]:null},setGridParam:function(d){return this.each(function(){this.grid&&"object"===typeof d&&b.extend(!0,this.p,d)})},getDataIDs:function(){var d=[],f=0,c,e=0;this.each(function(){if((c=this.rows.length)&&0<c)for(;f<c;)b(this.rows[f]).hasClass("jqgrow")&&(d[e]=this.rows[f].id,e++),f++});return d},setSelection:function(d,f,c){return this.each(function(){var e,a,j,g,h,i;if(void 0!==d&&(f=!1===
f?!1:!0,(a=this.rows.namedItem(""+d))&&a.className&&!(-1<a.className.indexOf("ui-state-disabled"))))if(!0===this.p.scrollrows&&(j=this.rows.namedItem(d).rowIndex,0<=j&&(e=b(this.grid.bDiv)[0].clientHeight,g=b(this.grid.bDiv)[0].scrollTop,h=b(this.rows[j]).position().top,j=this.rows[j].clientHeight,h+j>=e+g?b(this.grid.bDiv)[0].scrollTop=h-(e+g)+j+g:h<e+g&&h<g&&(b(this.grid.bDiv)[0].scrollTop=h))),!0===this.p.frozenColumns&&(i=this.p.id+"_frozen"),this.p.multiselect){if(this.setHeadCheckBox(!1),this.p.selrow=
a.id,g=b.inArray(this.p.selrow,this.p.selarrrow),-1===g?("ui-subgrid"!==a.className&&b(a).addClass("ui-state-highlight").attr("aria-selected","true"),e=!0,this.p.selarrrow.push(this.p.selrow)):("ui-subgrid"!==a.className&&b(a).removeClass("ui-state-highlight").attr("aria-selected","false"),e=!1,this.p.selarrrow.splice(g,1),h=this.p.selarrrow[0],this.p.selrow=void 0===h?null:h),b("#jqg_"+b.jgrid.jqID(this.p.id)+"_"+b.jgrid.jqID(a.id))[this.p.useProp?"prop":"attr"]("checked",e),i&&(-1===g?b("#"+b.jgrid.jqID(d),
"#"+b.jgrid.jqID(i)).addClass("ui-state-highlight"):b("#"+b.jgrid.jqID(d),"#"+b.jgrid.jqID(i)).removeClass("ui-state-highlight"),b("#jqg_"+b.jgrid.jqID(this.p.id)+"_"+b.jgrid.jqID(d),"#"+b.jgrid.jqID(i))[this.p.useProp?"prop":"attr"]("checked",e)),f)b(this).triggerHandler("jqGridSelectRow",[a.id,e,c]),this.p.onSelectRow&&this.p.onSelectRow.call(this,a.id,e,c)}else if("ui-subgrid"!==a.className&&(this.p.selrow!==a.id?(b(this.rows.namedItem(this.p.selrow)).removeClass("ui-state-highlight").attr({"aria-selected":"false",
tabindex:"-1"}),b(a).addClass("ui-state-highlight").attr({"aria-selected":"true",tabindex:"0"}),i&&(b("#"+b.jgrid.jqID(this.p.selrow),"#"+b.jgrid.jqID(i)).removeClass("ui-state-highlight"),b("#"+b.jgrid.jqID(d),"#"+b.jgrid.jqID(i)).addClass("ui-state-highlight")),e=!0):e=!1,this.p.selrow=a.id,f))b(this).triggerHandler("jqGridSelectRow",[a.id,e,c]),this.p.onSelectRow&&this.p.onSelectRow.call(this,a.id,e,c)})},resetSelection:function(d){return this.each(function(){var f=this,c,e,a;!0===f.p.frozenColumns&&
(a=f.p.id+"_frozen");if(void 0!==d){e=d===f.p.selrow?f.p.selrow:d;b("#"+b.jgrid.jqID(f.p.id)+" tbody:first tr#"+b.jgrid.jqID(e)).removeClass("ui-state-highlight").attr("aria-selected","false");a&&b("#"+b.jgrid.jqID(e),"#"+b.jgrid.jqID(a)).removeClass("ui-state-highlight");if(f.p.multiselect){b("#jqg_"+b.jgrid.jqID(f.p.id)+"_"+b.jgrid.jqID(e),"#"+b.jgrid.jqID(f.p.id))[f.p.useProp?"prop":"attr"]("checked",!1);if(a)b("#jqg_"+b.jgrid.jqID(f.p.id)+"_"+b.jgrid.jqID(e),"#"+b.jgrid.jqID(a))[f.p.useProp?"prop":
"attr"]("checked",!1);f.setHeadCheckBox(!1)}e=null}else f.p.multiselect?(b(f.p.selarrrow).each(function(d,e){c=f.rows.namedItem(e);b(c).removeClass("ui-state-highlight").attr("aria-selected","false");b("#jqg_"+b.jgrid.jqID(f.p.id)+"_"+b.jgrid.jqID(e))[f.p.useProp?"prop":"attr"]("checked",!1);a&&(b("#"+b.jgrid.jqID(e),"#"+b.jgrid.jqID(a)).removeClass("ui-state-highlight"),b("#jqg_"+b.jgrid.jqID(f.p.id)+"_"+b.jgrid.jqID(e),"#"+b.jgrid.jqID(a))[f.p.useProp?"prop":"attr"]("checked",!1))}),f.setHeadCheckBox(!1),
f.p.selarrrow=[]):f.p.selrow&&(b("#"+b.jgrid.jqID(f.p.id)+" tbody:first tr#"+b.jgrid.jqID(f.p.selrow)).removeClass("ui-state-highlight").attr("aria-selected","false"),a&&b("#"+b.jgrid.jqID(f.p.selrow),"#"+b.jgrid.jqID(a)).removeClass("ui-state-highlight"),f.p.selrow=null);!0===f.p.cellEdit&&0<=parseInt(f.p.iCol,10)&&0<=parseInt(f.p.iRow,10)&&(b("td:eq("+f.p.iCol+")",f.rows[f.p.iRow]).removeClass("edit-cell ui-state-highlight"),b(f.rows[f.p.iRow]).removeClass("selected-row ui-state-hover"));f.p.savedRow=
[]})},getRowData:function(d){var f={},c,e=!1,a,j=0;this.each(function(){var g=this,h,i;if(void 0===d)e=!0,c=[],a=g.rows.length;else{i=g.rows.namedItem(d);if(!i)return f;a=2}for(;j<a;)e&&(i=g.rows[j]),b(i).hasClass("jqgrow")&&(b('td[role="gridcell"]',i).each(function(a){h=g.p.colModel[a].name;if("cb"!==h&&"subgrid"!==h&&"rn"!==h)if(!0===g.p.treeGrid&&h===g.p.ExpandColumn)f[h]=b.jgrid.htmlDecode(b("span:first",this).html());else try{f[h]=b.unformat.call(g,this,{rowId:i.id,colModel:g.p.colModel[a]},
a)}catch(c){f[h]=b.jgrid.htmlDecode(b(this).html())}}),e&&(c.push(f),f={})),j++});return c||f},delRowData:function(d){var f=!1,c,e;this.each(function(){c=this.rows.namedItem(d);if(!c)return!1;b(c).remove();this.p.records--;this.p.reccount--;this.updatepager(!0,!1);f=!0;this.p.multiselect&&(e=b.inArray(d,this.p.selarrrow),-1!==e&&this.p.selarrrow.splice(e,1));this.p.selrow=this.p.multiselect&&0<this.p.selarrrow.length?this.p.selarrrow[this.p.selarrrow.length-1]:null;if("local"===this.p.datatype){var a=
this.p._index[b.jgrid.stripPref(this.p.idPrefix,d)];void 0!==a&&(this.p.data.splice(a,1),this.refreshIndex())}if(!0===this.p.altRows&&f){var j=this.p.altclass;b(this.rows).each(function(a){a%2===1?b(this).addClass(j):b(this).removeClass(j)})}});return f},setRowData:function(d,f,c){var e,a=!0,j;this.each(function(){if(!this.grid)return!1;var g=this,h,i,k=typeof c,l={};i=g.rows.namedItem(d);if(!i)return!1;if(f)try{if(b(this.p.colModel).each(function(a){e=this.name;var c=b.jgrid.getAccessor(f,e);void 0!==
c&&(l[e]=this.formatter&&"string"===typeof this.formatter&&"date"===this.formatter?b.unformat.date.call(g,c,this):c,h=g.formatter(d,c,a,f,"edit"),j=this.title?{title:b.jgrid.stripHtml(h)}:{},!0===g.p.treeGrid&&e===g.p.ExpandColumn?b("td[role='gridcell']:eq("+a+") > span:first",i).html(h).attr(j):b("td[role='gridcell']:eq("+a+")",i).html(h).attr(j))}),"local"===g.p.datatype){var o=b.jgrid.stripPref(g.p.idPrefix,d),n=g.p._index[o],m;if(g.p.treeGrid)for(m in g.p.treeReader)g.p.treeReader.hasOwnProperty(m)&&
delete l[g.p.treeReader[m]];void 0!==n&&(g.p.data[n]=b.extend(!0,g.p.data[n],l));l=null}}catch(t){a=!1}a&&("string"===k?b(i).addClass(c):"object"===k&&b(i).css(c),b(g).triggerHandler("jqGridAfterGridComplete"))});return a},addRowData:function(d,f,c,e){c||(c="last");var a=!1,j,g,h,i,k,l,o,n,m="",t,A,T,M,$,U;f&&(b.isArray(f)?(t=!0,c="last",A=d):(f=[f],t=!1),this.each(function(){var V=f.length;k=this.p.rownumbers===true?1:0;h=this.p.multiselect===true?1:0;i=this.p.subGrid===true?1:0;if(!t)if(d!==void 0)d=
""+d;else{d=b.jgrid.randId();if(this.p.keyIndex!==false){A=this.p.colModel[this.p.keyIndex+h+i+k].name;f[0][A]!==void 0&&(d=f[0][A])}}T=this.p.altclass;for(var N=0,X="",J={},S=b.isFunction(this.p.afterInsertRow)?true:false;N<V;){M=f[N];g=[];if(t){try{d=M[A];d===void 0&&(d=b.jgrid.randId())}catch(ja){d=b.jgrid.randId()}X=this.p.altRows===true?(this.rows.length-1)%2===0?T:"":""}U=d;d=this.p.idPrefix+d;if(k){m=this.formatCol(0,1,"",null,d,true);g[g.length]='<td role="gridcell" class="ui-state-default jqgrid-rownum" '+
m+">0</td>"}if(h){n='<input role="checkbox" type="checkbox" id="jqg_'+this.p.id+"_"+d+'" class="cbox"/>';m=this.formatCol(k,1,"",null,d,true);g[g.length]='<td role="gridcell" '+m+">"+n+"</td>"}i&&(g[g.length]=b(this).jqGrid("addSubGridCell",h+k,1));for(o=h+i+k;o<this.p.colModel.length;o++){$=this.p.colModel[o];j=$.name;J[j]=M[j];n=this.formatter(d,b.jgrid.getAccessor(M,j),o,M);m=this.formatCol(o,1,n,M,d,J);g[g.length]='<td role="gridcell" '+m+">"+n+"</td>"}g.unshift(this.constructTr(d,false,X,J,M,
false));g[g.length]="</tr>";if(this.rows.length===0)b("table:first",this.grid.bDiv).append(g.join(""));else switch(c){case "last":b(this.rows[this.rows.length-1]).after(g.join(""));l=this.rows.length-1;break;case "first":b(this.rows[0]).after(g.join(""));l=1;break;case "after":(l=this.rows.namedItem(e))&&(b(this.rows[l.rowIndex+1]).hasClass("ui-subgrid")?b(this.rows[l.rowIndex+1]).after(g):b(l).after(g.join("")));l++;break;case "before":if(l=this.rows.namedItem(e)){b(l).before(g.join(""));l=l.rowIndex}l--}this.p.subGrid===
true&&b(this).jqGrid("addSubGrid",h+k,l);this.p.records++;this.p.reccount++;b(this).triggerHandler("jqGridAfterInsertRow",[d,M,M]);S&&this.p.afterInsertRow.call(this,d,M,M);N++;if(this.p.datatype==="local"){J[this.p.localReader.id]=U;this.p._index[U]=this.p.data.length;this.p.data.push(J);J={}}}this.p.altRows===true&&!t&&(c==="last"?(this.rows.length-1)%2===1&&b(this.rows[this.rows.length-1]).addClass(T):b(this.rows).each(function(a){a%2===1?b(this).addClass(T):b(this).removeClass(T)}));this.updatepager(true,
true);a=true}));return a},footerData:function(d,f,c){function e(a){for(var b in a)if(a.hasOwnProperty(b))return!1;return!0}var a,j=!1,g={},h;void 0===d&&(d="get");"boolean"!==typeof c&&(c=!0);d=d.toLowerCase();this.each(function(){var i=this,k;if(!i.grid||!i.p.footerrow||"set"===d&&e(f))return!1;j=!0;b(this.p.colModel).each(function(e){a=this.name;"set"===d?void 0!==f[a]&&(k=c?i.formatter("",f[a],e,f,"edit"):f[a],h=this.title?{title:b.jgrid.stripHtml(k)}:{},b("tr.footrow td:eq("+e+")",i.grid.sDiv).html(k).attr(h),
j=!0):"get"===d&&(g[a]=b("tr.footrow td:eq("+e+")",i.grid.sDiv).html())})});return"get"===d?g:j},showHideCol:function(d,f){return this.each(function(){var c=this,e=!1,a=b.jgrid.cell_width?0:c.p.cellLayout,j;if(c.grid){"string"===typeof d&&(d=[d]);f="none"!==f?"":"none";var g=""===f?!0:!1,h=c.p.groupHeader&&("object"===typeof c.p.groupHeader||b.isFunction(c.p.groupHeader));h&&b(c).jqGrid("destroyGroupHeader",!1);b(this.p.colModel).each(function(h){if(-1!==b.inArray(this.name,d)&&this.hidden===g){if(!0===
c.p.frozenColumns&&!0===this.frozen)return!0;b("tr",c.grid.hDiv).each(function(){b(this.cells[h]).css("display",f)});b(c.rows).each(function(){b(this).hasClass("jqgroup")||b(this.cells[h]).css("display",f)});c.p.footerrow&&b("tr.footrow td:eq("+h+")",c.grid.sDiv).css("display",f);j=parseInt(this.width,10);c.p.tblwidth="none"===f?c.p.tblwidth-(j+a):c.p.tblwidth+(j+a);this.hidden=!g;e=!0;b(c).triggerHandler("jqGridShowHideCol",[g,this.name,h])}});!0===e&&(!0===c.p.shrinkToFit&&!isNaN(c.p.height)&&(c.p.tblwidth+=
parseInt(c.p.scrollOffset,10)),b(c).jqGrid("setGridWidth",!0===c.p.shrinkToFit?c.p.tblwidth:c.p.width));h&&b(c).jqGrid("setGroupHeaders",c.p.groupHeader)}})},hideCol:function(d){return this.each(function(){b(this).jqGrid("showHideCol",d,"none")})},showCol:function(d){return this.each(function(){b(this).jqGrid("showHideCol",d,"")})},remapColumns:function(d,f,c){function e(a){var c;c=a.length?b.makeArray(a):b.extend({},a);b.each(d,function(b){a[b]=c[this]})}function a(a,c){b(">tr"+(c||""),a).each(function(){var a=
this,c=b.makeArray(a.cells);b.each(d,function(){var b=c[this];b&&a.appendChild(b)})})}var j=this.get(0);e(j.p.colModel);e(j.p.colNames);e(j.grid.headers);a(b("thead:first",j.grid.hDiv),c&&":not(.ui-jqgrid-labels)");f&&a(b("#"+b.jgrid.jqID(j.p.id)+" tbody:first"),".jqgfirstrow, tr.jqgrow, tr.jqfoot");j.p.footerrow&&a(b("tbody:first",j.grid.sDiv));j.p.remapColumns&&(j.p.remapColumns.length?e(j.p.remapColumns):j.p.remapColumns=b.makeArray(d));j.p.lastsort=b.inArray(j.p.lastsort,d);j.p.treeGrid&&(j.p.expColInd=
b.inArray(j.p.expColInd,d));b(j).triggerHandler("jqGridRemapColumns",[d,f,c])},setGridWidth:function(d,f){return this.each(function(){if(this.grid){var c=this,e,a=0,j=b.jgrid.cell_width?0:c.p.cellLayout,g,h=0,i=!1,k=c.p.scrollOffset,l,o=0,n;"boolean"!==typeof f&&(f=c.p.shrinkToFit);if(!isNaN(d)){d=parseInt(d,10);c.grid.width=c.p.width=d;b("#gbox_"+b.jgrid.jqID(c.p.id)).css("width",d+"px");b("#gview_"+b.jgrid.jqID(c.p.id)).css("width",d+"px");b(c.grid.bDiv).css("width",d+"px");b(c.grid.hDiv).css("width",
d+"px");c.p.pager&&b(c.p.pager).css("width",d+"px");c.p.toppager&&b(c.p.toppager).css("width",d+"px");!0===c.p.toolbar[0]&&(b(c.grid.uDiv).css("width",d+"px"),"both"===c.p.toolbar[1]&&b(c.grid.ubDiv).css("width",d+"px"));c.p.footerrow&&b(c.grid.sDiv).css("width",d+"px");!1===f&&!0===c.p.forceFit&&(c.p.forceFit=!1);if(!0===f){b.each(c.p.colModel,function(){if(this.hidden===false){e=this.widthOrg;a=a+(e+j);this.fixed?o=o+(e+j):h++}});if(0===h)return;c.p.tblwidth=a;l=d-j*h-o;if(!isNaN(c.p.height)&&(b(c.grid.bDiv)[0].clientHeight<
b(c.grid.bDiv)[0].scrollHeight||1===c.rows.length))i=!0,l-=k;var a=0,m=0<c.grid.cols.length;b.each(c.p.colModel,function(b){if(this.hidden===false&&!this.fixed){e=this.widthOrg;e=Math.round(l*e/(c.p.tblwidth-j*h-o));if(!(e<0)){this.width=e;a=a+e;c.grid.headers[b].width=e;c.grid.headers[b].el.style.width=e+"px";if(c.p.footerrow)c.grid.footers[b].style.width=e+"px";if(m)c.grid.cols[b].style.width=e+"px";g=b}}});if(!g)return;n=0;i?d-o-(a+j*h)!==k&&(n=d-o-(a+j*h)-k):1!==Math.abs(d-o-(a+j*h))&&(n=d-o-
(a+j*h));c.p.colModel[g].width+=n;c.p.tblwidth=a+n+j*h+o;c.p.tblwidth>d?(i=c.p.tblwidth-parseInt(d,10),c.p.tblwidth=d,e=c.p.colModel[g].width-=i):e=c.p.colModel[g].width;c.grid.headers[g].width=e;c.grid.headers[g].el.style.width=e+"px";m&&(c.grid.cols[g].style.width=e+"px");c.p.footerrow&&(c.grid.footers[g].style.width=e+"px")}c.p.tblwidth&&(b("table:first",c.grid.bDiv).css("width",c.p.tblwidth+"px"),b("table:first",c.grid.hDiv).css("width",c.p.tblwidth+"px"),c.grid.hDiv.scrollLeft=c.grid.bDiv.scrollLeft,
c.p.footerrow&&b("table:first",c.grid.sDiv).css("width",c.p.tblwidth+"px"))}}})},setGridHeight:function(d){return this.each(function(){if(this.grid){var f=b(this.grid.bDiv);f.css({height:d+(isNaN(d)?"":"px")});!0===this.p.frozenColumns&&b("#"+b.jgrid.jqID(this.p.id)+"_frozen").parent().height(f.height()-16);this.p.height=d;this.p.scroll&&this.grid.populateVisible()}})},setCaption:function(d){return this.each(function(){this.p.caption=d;b("span.ui-jqgrid-title, span.ui-jqgrid-title-rtl",this.grid.cDiv).html(d);
b(this.grid.cDiv).show()})},setLabel:function(d,f,c,e){return this.each(function(){var a=-1;if(this.grid&&void 0!==d&&(b(this.p.colModel).each(function(b){if(this.name===d)return a=b,!1}),0<=a)){var j=b("tr.ui-jqgrid-labels th:eq("+a+")",this.grid.hDiv);if(f){var g=b(".s-ico",j);b("[id^=jqgh_]",j).empty().html(f).append(g);this.p.colNames[a]=f}c&&("string"===typeof c?b(j).addClass(c):b(j).css(c));"object"===typeof e&&b(j).attr(e)}})},setCell:function(d,f,c,e,a,j){return this.each(function(){var g=
-1,h,i;if(this.grid&&(isNaN(f)?b(this.p.colModel).each(function(a){if(this.name===f)return g=a,!1}):g=parseInt(f,10),0<=g&&(h=this.rows.namedItem(d)))){var k=b("td:eq("+g+")",h);if(""!==c||!0===j)h=this.formatter(d,c,g,h,"edit"),i=this.p.colModel[g].title?{title:b.jgrid.stripHtml(h)}:{},this.p.treeGrid&&0<b(".tree-wrap",b(k)).length?b("span",b(k)).html(h).attr(i):b(k).html(h).attr(i),"local"===this.p.datatype&&(h=this.p.colModel[g],c=h.formatter&&"string"===typeof h.formatter&&"date"===h.formatter?
b.unformat.date.call(this,c,h):c,i=this.p._index[b.jgrid.stripPref(this.p.idPrefix,d)],void 0!==i&&(this.p.data[i][h.name]=c));"string"===typeof e?b(k).addClass(e):e&&b(k).css(e);"object"===typeof a&&b(k).attr(a)}})},getCell:function(d,f){var c=!1;this.each(function(){var e=-1;if(this.grid&&(isNaN(f)?b(this.p.colModel).each(function(a){if(this.name===f)return e=a,!1}):e=parseInt(f,10),0<=e)){var a=this.rows.namedItem(d);if(a)try{c=b.unformat.call(this,b("td:eq("+e+")",a),{rowId:a.id,colModel:this.p.colModel[e]},
e)}catch(j){c=b.jgrid.htmlDecode(b("td:eq("+e+")",a).html())}}});return c},getCol:function(d,f,c){var e=[],a,j=0,g,h,i,f="boolean"!==typeof f?!1:f;void 0===c&&(c=!1);this.each(function(){var k=-1;if(this.grid&&(isNaN(d)?b(this.p.colModel).each(function(a){if(this.name===d)return k=a,!1}):k=parseInt(d,10),0<=k)){var l=this.rows.length,o=0;if(l&&0<l){for(;o<l;){if(b(this.rows[o]).hasClass("jqgrow")){try{a=b.unformat.call(this,b(this.rows[o].cells[k]),{rowId:this.rows[o].id,colModel:this.p.colModel[k]},
k)}catch(n){a=b.jgrid.htmlDecode(this.rows[o].cells[k].innerHTML)}c?(i=parseFloat(a),j+=i,void 0===h&&(h=g=i),g=Math.min(g,i),h=Math.max(h,i)):f?e.push({id:this.rows[o].id,value:a}):e.push(a)}o++}if(c)switch(c.toLowerCase()){case "sum":e=j;break;case "avg":e=j/l;break;case "count":e=l;break;case "min":e=g;break;case "max":e=h}}}});return e},clearGridData:function(d){return this.each(function(){if(this.grid){"boolean"!==typeof d&&(d=!1);if(this.p.deepempty)b("#"+b.jgrid.jqID(this.p.id)+" tbody:first tr:gt(0)").remove();
else{var f=b("#"+b.jgrid.jqID(this.p.id)+" tbody:first tr:first")[0];b("#"+b.jgrid.jqID(this.p.id)+" tbody:first").empty().append(f)}this.p.footerrow&&d&&b(".ui-jqgrid-ftable td",this.grid.sDiv).html("&#160;");this.p.selrow=null;this.p.selarrrow=[];this.p.savedRow=[];this.p.records=0;this.p.page=1;this.p.lastpage=0;this.p.reccount=0;this.p.data=[];this.p._index={};this.updatepager(!0,!1)}})},getInd:function(b,f){var c=!1,e;this.each(function(){(e=this.rows.namedItem(b))&&(c=!0===f?e:e.rowIndex)});
return c},bindKeys:function(d){var f=b.extend({onEnter:null,onSpace:null,onLeftKey:null,onRightKey:null,scrollingRows:!0},d||{});return this.each(function(){var c=this;b("body").is("[role]")||b("body").attr("role","application");c.p.scrollrows=f.scrollingRows;b(c).keydown(function(d){var a=b(c).find("tr[tabindex=0]")[0],j,g,h,i=c.p.treeReader.expanded_field;if(a)if(h=c.p._index[b.jgrid.stripPref(c.p.idPrefix,a.id)],37===d.keyCode||38===d.keyCode||39===d.keyCode||40===d.keyCode){if(38===d.keyCode){g=
a.previousSibling;j="";if(g)if(b(g).is(":hidden"))for(;g;){if(g=g.previousSibling,!b(g).is(":hidden")&&b(g).hasClass("jqgrow")){j=g.id;break}}else j=g.id;b(c).jqGrid("setSelection",j,!0,d);d.preventDefault()}if(40===d.keyCode){g=a.nextSibling;j="";if(g)if(b(g).is(":hidden"))for(;g;){if(g=g.nextSibling,!b(g).is(":hidden")&&b(g).hasClass("jqgrow")){j=g.id;break}}else j=g.id;b(c).jqGrid("setSelection",j,!0,d);d.preventDefault()}37===d.keyCode&&(c.p.treeGrid&&c.p.data[h][i]&&b(a).find("div.treeclick").trigger("click"),
b(c).triggerHandler("jqGridKeyLeft",[c.p.selrow]),b.isFunction(f.onLeftKey)&&f.onLeftKey.call(c,c.p.selrow));39===d.keyCode&&(c.p.treeGrid&&!c.p.data[h][i]&&b(a).find("div.treeclick").trigger("click"),b(c).triggerHandler("jqGridKeyRight",[c.p.selrow]),b.isFunction(f.onRightKey)&&f.onRightKey.call(c,c.p.selrow))}else 13===d.keyCode?(b(c).triggerHandler("jqGridKeyEnter",[c.p.selrow]),b.isFunction(f.onEnter)&&f.onEnter.call(c,c.p.selrow)):32===d.keyCode&&(b(c).triggerHandler("jqGridKeySpace",[c.p.selrow]),
b.isFunction(f.onSpace)&&f.onSpace.call(c,c.p.selrow))})})},unbindKeys:function(){return this.each(function(){b(this).unbind("keydown")})},getLocalRow:function(d){var f=!1,c;this.each(function(){void 0!==d&&(c=this.p._index[b.jgrid.stripPref(this.p.idPrefix,d)],0<=c&&(f=this.p.data[c]))});return f}})})(jQuery);
(function(a){a.fmatter={};a.extend(a.fmatter,{isBoolean:function(a){return"boolean"===typeof a},isObject:function(c){return c&&("object"===typeof c||a.isFunction(c))||!1},isString:function(a){return"string"===typeof a},isNumber:function(a){return"number"===typeof a&&isFinite(a)},isValue:function(a){return this.isObject(a)||this.isString(a)||this.isNumber(a)||this.isBoolean(a)},isEmpty:function(c){if(!this.isString(c)&&this.isValue(c))return!1;if(!this.isValue(c))return!0;c=a.trim(c).replace(/\&nbsp\;/ig,
"").replace(/\&#160\;/ig,"");return""===c}});a.fn.fmatter=function(c,b,d,e,f){var g=b,d=a.extend({},a.jgrid.formatter,d);try{g=a.fn.fmatter[c].call(this,b,d,e,f)}catch(h){}return g};a.fmatter.util={NumberFormat:function(c,b){a.fmatter.isNumber(c)||(c*=1);if(a.fmatter.isNumber(c)){var d=0>c,e=""+c,f=b.decimalSeparator||".",g;if(a.fmatter.isNumber(b.decimalPlaces)){var h=b.decimalPlaces,e=Math.pow(10,h),e=""+Math.round(c*e)/e;g=e.lastIndexOf(".");if(0<h){0>g?(e+=f,g=e.length-1):"."!==f&&(e=e.replace(".",
f));for(;e.length-1-g<h;)e+="0"}}if(b.thousandsSeparator){h=b.thousandsSeparator;g=e.lastIndexOf(f);g=-1<g?g:e.length;var f=e.substring(g),j=-1,i;for(i=g;0<i;i--){j++;if(0===j%3&&i!==g&&(!d||1<i))f=h+f;f=e.charAt(i-1)+f}e=f}e=b.prefix?b.prefix+e:e;return e=b.suffix?e+b.suffix:e}return c}};a.fn.fmatter.defaultFormat=function(c,b){return a.fmatter.isValue(c)&&""!==c?c:b.defaultValue||"&#160;"};a.fn.fmatter.email=function(c,b){return!a.fmatter.isEmpty(c)?'<a href="mailto:'+c+'">'+c+"</a>":a.fn.fmatter.defaultFormat(c,
b)};a.fn.fmatter.checkbox=function(c,b){var d=a.extend({},b.checkbox),e;void 0!==b.colModel&&void 0!==b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));e=!0===d.disabled?'disabled="disabled"':"";if(a.fmatter.isEmpty(c)||void 0===c)c=a.fn.fmatter.defaultFormat(c,d);c=(""+c).toLowerCase();return'<input type="checkbox" '+(0>c.search(/(false|f|0|no|n|off|undefined)/i)?" checked='checked' ":"")+' value="'+c+'" offval="no" '+e+"/>"};a.fn.fmatter.link=function(c,b){var d={target:b.target},
e="";void 0!==b.colModel&&void 0!==b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));d.target&&(e="target="+d.target);return!a.fmatter.isEmpty(c)?"<a "+e+' href="'+c+'">'+c+"</a>":a.fn.fmatter.defaultFormat(c,b)};a.fn.fmatter.showlink=function(c,b){var d={baseLinkUrl:b.baseLinkUrl,showAction:b.showAction,addParam:b.addParam||"",target:b.target,idName:b.idName},e="";void 0!==b.colModel&&void 0!==b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));d.target&&(e=
"target="+d.target);d=d.baseLinkUrl+d.showAction+"?"+d.idName+"="+b.rowId+d.addParam;return a.fmatter.isString(c)||a.fmatter.isNumber(c)?"<a "+e+' href="'+d+'">'+c+"</a>":a.fn.fmatter.defaultFormat(c,b)};a.fn.fmatter.integer=function(c,b){var d=a.extend({},b.integer);void 0!==b.colModel&&void 0!==b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));return a.fmatter.isEmpty(c)?d.defaultValue:a.fmatter.util.NumberFormat(c,d)};a.fn.fmatter.number=function(c,b){var d=a.extend({},b.number);
void 0!==b.colModel&&void 0!==b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));return a.fmatter.isEmpty(c)?d.defaultValue:a.fmatter.util.NumberFormat(c,d)};a.fn.fmatter.currency=function(c,b){var d=a.extend({},b.currency);void 0!==b.colModel&&void 0!==b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));return a.fmatter.isEmpty(c)?d.defaultValue:a.fmatter.util.NumberFormat(c,d)};a.fn.fmatter.date=function(c,b,d,e){d=a.extend({},b.date);void 0!==b.colModel&&void 0!==
b.colModel.formatoptions&&(d=a.extend({},d,b.colModel.formatoptions));return!d.reformatAfterEdit&&"edit"===e?a.fn.fmatter.defaultFormat(c,b):!a.fmatter.isEmpty(c)?a.jgrid.parseDate(d.srcformat,c,d.newformat,d):a.fn.fmatter.defaultFormat(c,b)};a.fn.fmatter.select=function(c,b){var c=""+c,d=!1,e=[],f,g;void 0!==b.colModel.formatoptions?(d=b.colModel.formatoptions.value,f=void 0===b.colModel.formatoptions.separator?":":b.colModel.formatoptions.separator,g=void 0===b.colModel.formatoptions.delimiter?
";":b.colModel.formatoptions.delimiter):void 0!==b.colModel.editoptions&&(d=b.colModel.editoptions.value,f=void 0===b.colModel.editoptions.separator?":":b.colModel.editoptions.separator,g=void 0===b.colModel.editoptions.delimiter?";":b.colModel.editoptions.delimiter);if(d){var h=!0===b.colModel.editoptions.multiple?!0:!1,j=[];h&&(j=c.split(","),j=a.map(j,function(b){return a.trim(b)}));if(a.fmatter.isString(d)){var i=d.split(g),k=0,l;for(l=0;l<i.length;l++)if(g=i[l].split(f),2<g.length&&(g[1]=a.map(g,
function(a,b){if(b>0)return a}).join(f)),h)-1<a.inArray(g[0],j)&&(e[k]=g[1],k++);else if(a.trim(g[0])===a.trim(c)){e[0]=g[1];break}}else a.fmatter.isObject(d)&&(h?e=a.map(j,function(a){return d[a]}):e[0]=d[c]||"")}c=e.join(", ");return""===c?a.fn.fmatter.defaultFormat(c,b):c};a.fn.fmatter.rowactions=function(c){var b=a(this).closest("tr.jqgrow"),d=b.attr("id"),e=a(this).closest("table.ui-jqgrid-btable").attr("id").replace(/_frozen([^_]*)$/,"$1"),e=a("#"+e),f=e[0],g=f.p,h=g.colModel[a.jgrid.getCellIndex(this)],
j=h.frozen?a("tr#"+d+" td:eq("+a.jgrid.getCellIndex(this)+") > div",e):a(this).parent(),i={keys:!1,onEdit:null,onSuccess:null,afterSave:null,onError:null,afterRestore:null,extraparam:{},url:null,restoreAfterError:!0,mtype:"POST",delOptions:{},editOptions:{}},k=function(b){a.isFunction(i.afterRestore)&&i.afterRestore.call(f,b);j.find("div.ui-inline-edit,div.ui-inline-del").show();j.find("div.ui-inline-save,div.ui-inline-cancel").hide()};void 0!==h.formatoptions&&(i=a.extend(i,h.formatoptions));void 0!==
g.editOptions&&(i.editOptions=g.editOptions);void 0!==g.delOptions&&(i.delOptions=g.delOptions);b.hasClass("jqgrid-new-row")&&(i.extraparam[g.prmNames.oper]=g.prmNames.addoper);b={keys:i.keys,oneditfunc:i.onEdit,successfunc:i.onSuccess,url:i.url,extraparam:i.extraparam,aftersavefunc:function(b,c){a.isFunction(i.afterSave)&&i.afterSave.call(f,b,c);j.find("div.ui-inline-edit,div.ui-inline-del").show();j.find("div.ui-inline-save,div.ui-inline-cancel").hide()},errorfunc:i.onError,afterrestorefunc:k,restoreAfterError:i.restoreAfterError,
mtype:i.mtype};switch(c){case "edit":e.jqGrid("editRow",d,b);j.find("div.ui-inline-edit,div.ui-inline-del").hide();j.find("div.ui-inline-save,div.ui-inline-cancel").show();e.triggerHandler("jqGridAfterGridComplete");break;case "save":e.jqGrid("saveRow",d,b)&&(j.find("div.ui-inline-edit,div.ui-inline-del").show(),j.find("div.ui-inline-save,div.ui-inline-cancel").hide(),e.triggerHandler("jqGridAfterGridComplete"));break;case "cancel":e.jqGrid("restoreRow",d,k);j.find("div.ui-inline-edit,div.ui-inline-del").show();
j.find("div.ui-inline-save,div.ui-inline-cancel").hide();e.triggerHandler("jqGridAfterGridComplete");break;case "del":e.jqGrid("delGridRow",d,i.delOptions);break;case "formedit":e.jqGrid("setSelection",d),e.jqGrid("editGridRow",d,i.editOptions)}};a.fn.fmatter.actions=function(c,b){var d={keys:!1,editbutton:!0,delbutton:!0,editformbutton:!1},e=b.rowId,f="";void 0!==b.colModel.formatoptions&&(d=a.extend(d,b.colModel.formatoptions));if(void 0===e||a.fmatter.isEmpty(e))return"";d.editformbutton?f+="<div title='"+
a.jgrid.nav.edittitle+"' style='float:left;cursor:pointer;' class='ui-pg-div ui-inline-edit' "+("id='jEditButton_"+e+"' onclick=jQuery.fn.fmatter.rowactions.call(this,'formedit'); onmouseover=jQuery(this).addClass('ui-state-hover'); onmouseout=jQuery(this).removeClass('ui-state-hover'); ")+"><span class='ui-icon ui-icon-pencil'></span></div>":d.editbutton&&(f+="<div title='"+a.jgrid.nav.edittitle+"' style='float:left;cursor:pointer;' class='ui-pg-div ui-inline-edit' "+("id='jEditButton_"+e+"' onclick=jQuery.fn.fmatter.rowactions.call(this,'edit'); onmouseover=jQuery(this).addClass('ui-state-hover'); onmouseout=jQuery(this).removeClass('ui-state-hover') ")+
"><span class='ui-icon ui-icon-pencil'></span></div>");d.delbutton&&(f+="<div title='"+a.jgrid.nav.deltitle+"' style='float:left;margin-left:5px;' class='ui-pg-div ui-inline-del' "+("id='jDeleteButton_"+e+"' onclick=jQuery.fn.fmatter.rowactions.call(this,'del'); onmouseover=jQuery(this).addClass('ui-state-hover'); onmouseout=jQuery(this).removeClass('ui-state-hover'); ")+"><span class='ui-icon ui-icon-trash'></span></div>");f+="<div title='"+a.jgrid.edit.bSubmit+"' style='float:left;display:none' class='ui-pg-div ui-inline-save' "+
("id='jSaveButton_"+e+"' onclick=jQuery.fn.fmatter.rowactions.call(this,'save'); onmouseover=jQuery(this).addClass('ui-state-hover'); onmouseout=jQuery(this).removeClass('ui-state-hover'); ")+"><span class='ui-icon ui-icon-disk'></span></div>";f+="<div title='"+a.jgrid.edit.bCancel+"' style='float:left;display:none;margin-left:5px;' class='ui-pg-div ui-inline-cancel' "+("id='jCancelButton_"+e+"' onclick=jQuery.fn.fmatter.rowactions.call(this,'cancel'); onmouseover=jQuery(this).addClass('ui-state-hover'); onmouseout=jQuery(this).removeClass('ui-state-hover'); ")+
"><span class='ui-icon ui-icon-cancel'></span></div>";return"<div style='margin-left:8px;'>"+f+"</div>"};a.unformat=function(c,b,d,e){var f,g=b.colModel.formatter,h=b.colModel.formatoptions||{},j=/([\.\*\_\'\(\)\{\}\+\?\\])/g,i=b.colModel.unformat||a.fn.fmatter[g]&&a.fn.fmatter[g].unformat;if(void 0!==i&&a.isFunction(i))f=i.call(this,a(c).text(),b,c);else if(void 0!==g&&a.fmatter.isString(g))switch(f=a.jgrid.formatter||{},g){case "integer":h=a.extend({},f.integer,h);b=h.thousandsSeparator.replace(j,
"\\$1");f=a(c).text().replace(RegExp(b,"g"),"");break;case "number":h=a.extend({},f.number,h);b=h.thousandsSeparator.replace(j,"\\$1");f=a(c).text().replace(RegExp(b,"g"),"").replace(h.decimalSeparator,".");break;case "currency":h=a.extend({},f.currency,h);b=h.thousandsSeparator.replace(j,"\\$1");b=RegExp(b,"g");f=a(c).text();h.prefix&&h.prefix.length&&(f=f.substr(h.prefix.length));h.suffix&&h.suffix.length&&(f=f.substr(0,f.length-h.suffix.length));f=f.replace(b,"").replace(h.decimalSeparator,".");
break;case "checkbox":h=b.colModel.editoptions?b.colModel.editoptions.value.split(":"):["Yes","No"];f=a("input",c).is(":checked")?h[0]:h[1];break;case "select":f=a.unformat.select(c,b,d,e);break;case "actions":return"";default:f=a(c).text()}return void 0!==f?f:!0===e?a(c).text():a.jgrid.htmlDecode(a(c).html())};a.unformat.select=function(c,b,d,e){d=[];c=a(c).text();if(!0===e)return c;var e=a.extend({},void 0!==b.colModel.formatoptions?b.colModel.formatoptions:b.colModel.editoptions),b=void 0===e.separator?
":":e.separator,f=void 0===e.delimiter?";":e.delimiter;if(e.value){var g=e.value,e=!0===e.multiple?!0:!1,h=[];e&&(h=c.split(","),h=a.map(h,function(b){return a.trim(b)}));if(a.fmatter.isString(g)){var j=g.split(f),i=0,k;for(k=0;k<j.length;k++)if(f=j[k].split(b),2<f.length&&(f[1]=a.map(f,function(a,b){if(b>0)return a}).join(b)),e)-1<a.inArray(f[1],h)&&(d[i]=f[0],i++);else if(a.trim(f[1])===a.trim(c)){d[0]=f[0];break}}else if(a.fmatter.isObject(g)||a.isArray(g))e||(h[0]=c),d=a.map(h,function(b){var c;
a.each(g,function(a,d){if(d===b){c=a;return false}});if(c!==void 0)return c});return d.join(", ")}return c||""};a.unformat.date=function(c,b){var d=a.jgrid.formatter.date||{};void 0!==b.formatoptions&&(d=a.extend({},d,b.formatoptions));return!a.fmatter.isEmpty(c)?a.jgrid.parseDate(d.newformat,c,d.srcformat,d):a.fn.fmatter.defaultFormat(c,b)}})(jQuery);
(function(a){a.jgrid.extend({getColProp:function(a){var c={},f=this[0];if(!f.grid)return!1;var f=f.p.colModel,g;for(g=0;g<f.length;g++)if(f[g].name===a){c=f[g];break}return c},setColProp:function(b,c){return this.each(function(){if(this.grid&&c){var f=this.p.colModel,g;for(g=0;g<f.length;g++)if(f[g].name===b){a.extend(!0,this.p.colModel[g],c);break}}})},sortGrid:function(a,c,f){return this.each(function(){var g=-1,j;if(this.grid){a||(a=this.p.sortname);for(j=0;j<this.p.colModel.length;j++)if(this.p.colModel[j].index===
a||this.p.colModel[j].name===a){g=j;break}-1!==g&&(j=this.p.colModel[g].sortable,"boolean"!==typeof j&&(j=!0),"boolean"!==typeof c&&(c=!1),j&&this.sortData("jqgh_"+this.p.id+"_"+a,g,c,f))}})},clearBeforeUnload:function(){return this.each(function(){var b=this.grid;b.emptyRows.call(this,!0,!0);a(b.hDiv).unbind("mousemove");a(this).unbind();b.dragEnd=null;b.dragMove=null;b.dragStart=null;b.emptyRows=null;b.populate=null;b.populateVisible=null;b.scrollGrid=null;b.selectionPreserver=null;b.bDiv=null;
b.cDiv=null;b.hDiv=null;b.cols=null;var c,f=b.headers.length;for(c=0;c<f;c++)b.headers[c].el=null;this.addJSONData=this.addXmlData=this.formatter=this.constructTr=this.setHeadCheckBox=this.refreshIndex=this.updatepager=this.sortData=this.formatCol=null})},GridDestroy:function(){return this.each(function(){if(this.grid){this.p.pager&&a(this.p.pager).remove();try{a(this).jqGrid("clearBeforeUnload"),a("#gbox_"+a.jgrid.jqID(this.id)).remove()}catch(b){}}})},GridUnload:function(){return this.each(function(){if(this.grid){var b=
a(this).attr("id"),c=a(this).attr("class");this.p.pager&&a(this.p.pager).empty().removeClass("ui-state-default ui-jqgrid-pager corner-bottom");var f=document.createElement("table");a(f).attr({id:b});f.className=c;b=a.jgrid.jqID(this.id);a(f).removeClass("ui-jqgrid-btable");1===a(this.p.pager).parents("#gbox_"+b).length?(a(f).insertBefore("#gbox_"+b).show(),a(this.p.pager).insertBefore("#gbox_"+b)):a(f).insertBefore("#gbox_"+b).show();a(this).jqGrid("clearBeforeUnload");a("#gbox_"+b).remove()}})},
setGridState:function(b){return this.each(function(){this.grid&&("hidden"===b?(a(".ui-jqgrid-bdiv, .ui-jqgrid-hdiv","#gview_"+a.jgrid.jqID(this.p.id)).slideUp("fast"),this.p.pager&&a(this.p.pager).slideUp("fast"),this.p.toppager&&a(this.p.toppager).slideUp("fast"),!0===this.p.toolbar[0]&&("both"===this.p.toolbar[1]&&a(this.grid.ubDiv).slideUp("fast"),a(this.grid.uDiv).slideUp("fast")),this.p.footerrow&&a(".ui-jqgrid-sdiv","#gbox_"+a.jgrid.jqID(this.p.id)).slideUp("fast"),a(".ui-jqgrid-titlebar-close span",
this.grid.cDiv).removeClass("ui-icon-circle-triangle-n").addClass("ui-icon-circle-triangle-s"),this.p.gridstate="hidden"):"visible"===b&&(a(".ui-jqgrid-hdiv, .ui-jqgrid-bdiv","#gview_"+a.jgrid.jqID(this.p.id)).slideDown("fast"),this.p.pager&&a(this.p.pager).slideDown("fast"),this.p.toppager&&a(this.p.toppager).slideDown("fast"),!0===this.p.toolbar[0]&&("both"===this.p.toolbar[1]&&a(this.grid.ubDiv).slideDown("fast"),a(this.grid.uDiv).slideDown("fast")),this.p.footerrow&&a(".ui-jqgrid-sdiv","#gbox_"+
a.jgrid.jqID(this.p.id)).slideDown("fast"),a(".ui-jqgrid-titlebar-close span",this.grid.cDiv).removeClass("ui-icon-circle-triangle-s").addClass("ui-icon-circle-triangle-n"),this.p.gridstate="visible"))})},filterToolbar:function(b){b=a.extend({autosearch:!0,searchOnEnter:!0,beforeSearch:null,afterSearch:null,beforeClear:null,afterClear:null,searchurl:"",stringResult:!1,groupOp:"AND",defaultSearch:"bw",searchOperators:!1,operandTitle:"Click to select search operation.",operands:{eq:"==",ne:"!",lt:"<",
le:"<=",gt:">",ge:">=",bw:"^",bn:"!^","in":"=",ni:"!=",ew:"|",en:"!@",cn:"~",nc:"!~",nu:"#",nn:"!#"}},a.jgrid.search,b||{});return this.each(function(){var c=this;if(!this.ftoolbar){var f=function(){var e={},d=0,f,l,j={},n;a.each(c.p.colModel,function(){var i=a("#gs_"+a.jgrid.jqID(this.name),!0===this.frozen&&!0===c.p.frozenColumns?c.grid.fhDiv:c.grid.hDiv);l=this.index||this.name;n=b.searchOperators?i.parent().prev().children("a").attr("soper")||b.defaultSearch:this.searchoptions&&this.searchoptions.sopt?
this.searchoptions.sopt[0]:"select"===this.stype?"eq":b.defaultSearch;if((f="custom"===this.stype&&a.isFunction(this.searchoptions.custom_value)&&0<i.length&&"SPAN"===i[0].nodeName.toUpperCase()?this.searchoptions.custom_value.call(c,i.children(".customelement:first"),"get"):i.val())||"nu"===n||"nn"===n)e[l]=f,j[l]=n,d++;else try{delete c.p.postData[l]}catch(k){}});var i=0<d?!0:!1;if(!0===b.stringResult||"local"===c.p.datatype){var k='{"groupOp":"'+b.groupOp+'","rules":[',h=0;a.each(e,function(a,
b){0<h&&(k+=",");k+='{"field":"'+a+'",';k+='"op":"'+j[a]+'",';k+='"data":"'+(b+"").replace(/\\/g,"\\\\").replace(/\"/g,'\\"')+'"}';h++});k+="]}";a.extend(c.p.postData,{filters:k});a.each(["searchField","searchString","searchOper"],function(a,b){c.p.postData.hasOwnProperty(b)&&delete c.p.postData[b]})}else a.extend(c.p.postData,e);var g;c.p.searchurl&&(g=c.p.url,a(c).jqGrid("setGridParam",{url:c.p.searchurl}));var o="stop"===a(c).triggerHandler("jqGridToolbarBeforeSearch")?!0:!1;!o&&a.isFunction(b.beforeSearch)&&
(o=b.beforeSearch.call(c));o||a(c).jqGrid("setGridParam",{search:i}).trigger("reloadGrid",[{page:1}]);g&&a(c).jqGrid("setGridParam",{url:g});a(c).triggerHandler("jqGridToolbarAfterSearch");a.isFunction(b.afterSearch)&&b.afterSearch.call(c)},g=function(e,d,j){a("#sopt_menu").remove();var d=parseInt(d,10),j=parseInt(j,10)+18,d='<ul id="sopt_menu" class="ui-search-menu" role="menu" tabindex="0" style="font-size:'+(a(".ui-jqgrid-view").css("font-size")||"11px")+";left:"+d+"px;top:"+j+'px;">',j=a(e).attr("soper"),
l,h=[],n,i=0,k=a(e).attr("colname");for(l=c.p.colModel.length;i<l&&c.p.colModel[i].name!==k;)i++;i=c.p.colModel[i];k=a.extend({},i.searchoptions);k.sopt||(k.sopt=[],k.sopt[0]="select"===i.stype?"eq":b.defaultSearch);a.each(b.odata,function(){h.push(this.oper)});for(i=0;i<k.sopt.length;i++)n=a.inArray(k.sopt[i],h),-1!==n&&(l=j===b.odata[n].oper?"ui-state-highlight":"",d+='<li class="ui-menu-item '+l+'" role="presentation"><a class="ui-corner-all g-menu-item" tabindex="0" role="menuitem" value="'+b.odata[n].oper+
'" oper="'+b.operands[b.odata[n].oper]+'"><table cellspacing="0" cellpadding="0" border="0"><tr><td width="25px">'+b.operands[b.odata[n].oper]+"</td><td>"+b.odata[n].text+"</td></tr></table></a></li>");a("body").append(d+"</ul>");a("#sopt_menu").addClass("ui-menu ui-widget ui-widget-content ui-corner-all");a("#sopt_menu > li > a").hover(function(){a(this).addClass("ui-state-hover")},function(){a(this).removeClass("ui-state-hover")}).click(function(){var d=a(this).attr("value"),i=a(this).attr("oper");
a(c).triggerHandler("jqGridToolbarSelectOper",[d,i,e]);a("#sopt_menu").hide();a(e).text(i).attr("soper",d);if(b.autosearch===true){i=a(e).parent().next().children()[0];(a(i).val()||d==="nu"||d==="nn")&&f()}})},j=a("<tr class='ui-search-toolbar' role='rowheader'></tr>"),h;a.each(c.p.colModel,function(){var e=this,d,g;g="";var l="=",s,n=a("<th role='columnheader' class='ui-state-default ui-th-column ui-th-"+c.p.direction+"'></th>"),i=a("<div style='position:relative;height:100%;padding-right:0.3em;padding-left:0.3em;'></div>"),
k=a("<table class='ui-search-table' cellspacing='0'><tr><td class='ui-search-oper'></td><td class='ui-search-input'></td></tr></table>");!0===this.hidden&&a(n).css("display","none");this.search=!1===this.search?!1:!0;void 0===this.stype&&(this.stype="text");d=a.extend({},this.searchoptions||{});if(this.search){if(b.searchOperators){g=d.sopt?d.sopt[0]:"select"===e.stype?"eq":b.defaultSearch;for(s=0;s<b.odata.length;s++)if(b.odata[s].oper===g){l=b.operands[g]||"";break}g="<a title='"+(null!=d.searchtitle?
d.searchtitle:b.operandTitle)+"' style='padding-right: 0.5em;' soper='"+g+"' class='soptclass' colname='"+this.name+"'>"+l+"</a>"}a("td:eq(0)",k).append(g);switch(this.stype){case "select":if(g=this.surl||d.dataUrl)a.ajax(a.extend({url:g,dataType:"html",success:function(g){if(d.buildSelect!==void 0){if(g=d.buildSelect(g)){a("td:eq(1)",k).append(g);a(i).append(k)}}else{a("td:eq(1)",k).append(g);a(i).append(k)}d.defaultValue!==void 0&&a("select",i).val(d.defaultValue);a("select",i).attr({name:e.index||
e.name,id:"gs_"+e.name});d.attr&&a("select",i).attr(d.attr);a("select",i).css({width:"100%"});a.jgrid.bindEv.call(c,a("select",i)[0],d);b.autosearch===true&&a("select",i).change(function(){f();return false});g=null}},a.jgrid.ajaxOptions,c.p.ajaxSelectOptions||{}));else{var m,r,o;e.searchoptions?(m=void 0===e.searchoptions.value?"":e.searchoptions.value,r=void 0===e.searchoptions.separator?":":e.searchoptions.separator,o=void 0===e.searchoptions.delimiter?";":e.searchoptions.delimiter):e.editoptions&&
(m=void 0===e.editoptions.value?"":e.editoptions.value,r=void 0===e.editoptions.separator?":":e.editoptions.separator,o=void 0===e.editoptions.delimiter?";":e.editoptions.delimiter);if(m){l=document.createElement("select");l.style.width="100%";a(l).attr({name:e.index||e.name,id:"gs_"+e.name});var q;if("string"===typeof m){g=m.split(o);for(q=0;q<g.length;q++)m=g[q].split(r),o=document.createElement("option"),o.value=m[0],o.innerHTML=m[1],l.appendChild(o)}else if("object"===typeof m)for(q in m)m.hasOwnProperty(q)&&
(o=document.createElement("option"),o.value=q,o.innerHTML=m[q],l.appendChild(o));void 0!==d.defaultValue&&a(l).val(d.defaultValue);d.attr&&a(l).attr(d.attr);a.jgrid.bindEv.call(c,l,d);a("td:eq(1)",k).append(l);a(i).append(k);!0===b.autosearch&&a(l).change(function(){f();return false})}}break;case "text":r=void 0!==d.defaultValue?d.defaultValue:"";a("td:eq(1)",k).append("<input type='text' style='width:100%;padding:0px;' name='"+(e.index||e.name)+"' id='gs_"+e.name+"' value='"+r+"'/>");a(i).append(k);
d.attr&&a("input",i).attr(d.attr);a.jgrid.bindEv.call(c,a("input",i)[0],d);!0===b.autosearch&&(b.searchOnEnter?a("input",i).keypress(function(a){if((a.charCode||a.keyCode||0)===13){f();return false}return this}):a("input",i).keydown(function(a){switch(a.which){case 13:return false;case 9:case 16:case 37:case 38:case 39:case 40:case 27:break;default:h&&clearTimeout(h);h=setTimeout(function(){f()},500)}}));break;case "custom":a("td:eq(1)",k).append("<span style='width:95%;padding:0px;' name='"+(e.index||
e.name)+"' id='gs_"+e.name+"'/>");a(i).append(k);try{if(a.isFunction(d.custom_element)){var u=d.custom_element.call(c,void 0!==d.defaultValue?d.defaultValue:"",d);if(u)u=a(u).addClass("customelement"),a(i).find(">span").append(u);else throw"e2";}else throw"e1";}catch(t){"e1"===t&&a.jgrid.info_dialog(a.jgrid.errors.errcap,"function 'custom_element' "+a.jgrid.edit.msg.nodefined,a.jgrid.edit.bClose),"e2"===t?a.jgrid.info_dialog(a.jgrid.errors.errcap,"function 'custom_element' "+a.jgrid.edit.msg.novalue,
a.jgrid.edit.bClose):a.jgrid.info_dialog(a.jgrid.errors.errcap,"string"===typeof t?t:t.message,a.jgrid.edit.bClose)}}}a(n).append(i);a(j).append(n);b.searchOperators||a("td:eq(0)",k).hide()});a("table thead",c.grid.hDiv).append(j);b.searchOperators&&(a(".soptclass").click(function(b){var c=a(this).offset();g(this,c.left,c.top);b.stopPropagation()}),a("body").on("click",function(b){"soptclass"!==b.target.className&&a("#sopt_menu").hide()}));this.ftoolbar=!0;this.triggerToolbar=f;this.clearToolbar=
function(e){var d={},f=0,g,e=typeof e!=="boolean"?true:e;a.each(c.p.colModel,function(){var b,e=a("#gs_"+a.jgrid.jqID(this.name),this.frozen===true&&c.p.frozenColumns===true?c.grid.fhDiv:c.grid.hDiv);if(this.searchoptions&&this.searchoptions.defaultValue!==void 0)b=this.searchoptions.defaultValue;g=this.index||this.name;switch(this.stype){case "select":e.find("option").each(function(c){if(c===0)this.selected=true;if(a(this).val()===b){this.selected=true;return false}});if(b!==void 0){d[g]=b;f++}else try{delete c.p.postData[g]}catch(i){}break;
case "text":e.val(b);if(b!==void 0){d[g]=b;f++}else try{delete c.p.postData[g]}catch(h){}break;case "custom":a.isFunction(this.searchoptions.custom_value)&&e.length>0&&e[0].nodeName.toUpperCase()==="SPAN"&&this.searchoptions.custom_value.call(c,e.children(".customelement:first"),"set",b)}});var j=f>0?true:false;if(b.stringResult===true||c.p.datatype==="local"){var h='{"groupOp":"'+b.groupOp+'","rules":[',i=0;a.each(d,function(a,b){i>0&&(h=h+",");h=h+('{"field":"'+a+'",');h=h+'"op":"eq",';h=h+('"data":"'+
(b+"").replace(/\\/g,"\\\\").replace(/\"/g,'\\"')+'"}');i++});h=h+"]}";a.extend(c.p.postData,{filters:h});a.each(["searchField","searchString","searchOper"],function(a,b){c.p.postData.hasOwnProperty(b)&&delete c.p.postData[b]})}else a.extend(c.p.postData,d);var k;if(c.p.searchurl){k=c.p.url;a(c).jqGrid("setGridParam",{url:c.p.searchurl})}var m=a(c).triggerHandler("jqGridToolbarBeforeClear")==="stop"?true:false;!m&&a.isFunction(b.beforeClear)&&(m=b.beforeClear.call(c));m||e&&a(c).jqGrid("setGridParam",
{search:j}).trigger("reloadGrid",[{page:1}]);k&&a(c).jqGrid("setGridParam",{url:k});a(c).triggerHandler("jqGridToolbarAfterClear");a.isFunction(b.afterClear)&&b.afterClear()};this.toggleToolbar=function(){var b=a("tr.ui-search-toolbar",c.grid.hDiv),d=c.p.frozenColumns===true?a("tr.ui-search-toolbar",c.grid.fhDiv):false;if(b.css("display")==="none"){b.show();d&&d.show()}else{b.hide();d&&d.hide()}}}})},destroyFilterToolbar:function(){return this.each(function(){this.ftoolbar&&(this.toggleToolbar=this.clearToolbar=
this.triggerToolbar=null,this.ftoolbar=!1,a(this.grid.hDiv).find("table thead tr.ui-search-toolbar").remove())})},destroyGroupHeader:function(b){void 0===b&&(b=!0);return this.each(function(){var c,f,g,j,h,e;f=this.grid;var d=a("table.ui-jqgrid-htable thead",f.hDiv),p=this.p.colModel;if(f){a(this).unbind(".setGroupHeaders");c=a("<tr>",{role:"rowheader"}).addClass("ui-jqgrid-labels");j=f.headers;f=0;for(g=j.length;f<g;f++){h=p[f].hidden?"none":"";h=a(j[f].el).width(j[f].width).css("display",h);try{h.removeAttr("rowSpan")}catch(l){h.attr("rowSpan",
1)}c.append(h);e=h.children("span.ui-jqgrid-resize");0<e.length&&(e[0].style.height="");h.children("div")[0].style.top=""}a(d).children("tr.ui-jqgrid-labels").remove();a(d).prepend(c);!0===b&&a(this).jqGrid("setGridParam",{groupHeader:null})}})},setGroupHeaders:function(b){b=a.extend({useColSpanStyle:!1,groupHeaders:[]},b||{});return this.each(function(){this.p.groupHeader=b;var c,f,g=0,j,h,e,d,p,l=this.p.colModel,s=l.length,n=this.grid.headers,i=a("table.ui-jqgrid-htable",this.grid.hDiv),k=i.children("thead").children("tr.ui-jqgrid-labels:last").addClass("jqg-second-row-header");
j=i.children("thead");var m=i.find(".jqg-first-row-header");void 0===m[0]?m=a("<tr>",{role:"row","aria-hidden":"true"}).addClass("jqg-first-row-header").css("height","auto"):m.empty();var r,o=function(a,b){var c=b.length,d;for(d=0;d<c;d++)if(b[d].startColumnName===a)return d;return-1};a(this).prepend(j);j=a("<tr>",{role:"rowheader"}).addClass("ui-jqgrid-labels jqg-third-row-header");for(c=0;c<s;c++)if(e=n[c].el,d=a(e),f=l[c],h={height:"0px",width:n[c].width+"px",display:f.hidden?"none":""},a("<th>",
{role:"gridcell"}).css(h).addClass("ui-first-th-"+this.p.direction).appendTo(m),e.style.width="",h=o(f.name,b.groupHeaders),0<=h){h=b.groupHeaders[h];g=h.numberOfColumns;p=h.titleText;for(h=f=0;h<g&&c+h<s;h++)l[c+h].hidden||f++;h=a("<th>").attr({role:"columnheader"}).addClass("ui-state-default ui-th-column-header ui-th-"+this.p.direction).css({height:"22px","border-top":"0px none"}).html(p);0<f&&h.attr("colspan",""+f);this.p.headertitles&&h.attr("title",h.text());0===f&&h.hide();d.before(h);j.append(e);
g-=1}else 0===g?b.useColSpanStyle?d.attr("rowspan","2"):(a("<th>",{role:"columnheader"}).addClass("ui-state-default ui-th-column-header ui-th-"+this.p.direction).css({display:f.hidden?"none":"","border-top":"0px none"}).insertBefore(d),j.append(e)):(j.append(e),g--);l=a(this).children("thead");l.prepend(m);j.insertAfter(k);i.append(l);b.useColSpanStyle&&(i.find("span.ui-jqgrid-resize").each(function(){var b=a(this).parent();b.is(":visible")&&(this.style.cssText="height: "+b.height()+"px !important; cursor: col-resize;")}),
i.find("div.ui-jqgrid-sortable").each(function(){var b=a(this),c=b.parent();c.is(":visible")&&c.is(":has(span.ui-jqgrid-resize)")&&b.css("top",(c.height()-b.outerHeight())/2+"px")}));r=l.find("tr.jqg-first-row-header");a(this).bind("jqGridResizeStop.setGroupHeaders",function(a,b,c){r.find("th").eq(c).width(b)})})},setFrozenColumns:function(){return this.each(function(){if(this.grid){var b=this,c=b.p.colModel,f=0,g=c.length,j=-1,h=!1;if(!(!0===b.p.subGrid||!0===b.p.treeGrid||!0===b.p.cellEdit||b.p.sortable||
b.p.scroll||b.p.grouping)){b.p.rownumbers&&f++;for(b.p.multiselect&&f++;f<g;){if(!0===c[f].frozen)h=!0,j=f;else break;f++}if(0<=j&&h){c=b.p.caption?a(b.grid.cDiv).outerHeight():0;f=a(".ui-jqgrid-htable","#gview_"+a.jgrid.jqID(b.p.id)).height();b.p.toppager&&(c+=a(b.grid.topDiv).outerHeight());!0===b.p.toolbar[0]&&"bottom"!==b.p.toolbar[1]&&(c+=a(b.grid.uDiv).outerHeight());b.grid.fhDiv=a('<div style="position:absolute;left:0px;top:'+c+"px;height:"+f+'px;" class="frozen-div ui-state-default ui-jqgrid-hdiv"></div>');
b.grid.fbDiv=a('<div style="position:absolute;left:0px;top:'+(parseInt(c,10)+parseInt(f,10)+1)+'px;overflow-y:hidden" class="frozen-bdiv ui-jqgrid-bdiv"></div>');a("#gview_"+a.jgrid.jqID(b.p.id)).append(b.grid.fhDiv);c=a(".ui-jqgrid-htable","#gview_"+a.jgrid.jqID(b.p.id)).clone(!0);if(b.p.groupHeader){a("tr.jqg-first-row-header, tr.jqg-third-row-header",c).each(function(){a("th:gt("+j+")",this).remove()});var e=-1,d=-1,p,l;a("tr.jqg-second-row-header th",c).each(function(){p=parseInt(a(this).attr("colspan"),
10);if(l=parseInt(a(this).attr("rowspan"),10))e++,d++;p&&(e+=p,d++);if(e===j)return!1});e!==j&&(d=j);a("tr.jqg-second-row-header",c).each(function(){a("th:gt("+d+")",this).remove()})}else a("tr",c).each(function(){a("th:gt("+j+")",this).remove()});a(c).width(1);a(b.grid.fhDiv).append(c).mousemove(function(a){if(b.grid.resizing)return b.grid.dragMove(a),!1});a(b).bind("jqGridResizeStop.setFrozenColumns",function(c,d,e){c=a(".ui-jqgrid-htable",b.grid.fhDiv);a("th:eq("+e+")",c).width(d);c=a(".ui-jqgrid-btable",
b.grid.fbDiv);a("tr:first td:eq("+e+")",c).width(d)});a(b).bind("jqGridOnSortCol.setFrozenColumns",function(c,d,e){c=a("tr.ui-jqgrid-labels:last th:eq("+b.p.lastsort+")",b.grid.fhDiv);d=a("tr.ui-jqgrid-labels:last th:eq("+e+")",b.grid.fhDiv);a("span.ui-grid-ico-sort",c).addClass("ui-state-disabled");a(c).attr("aria-selected","false");a("span.ui-icon-"+b.p.sortorder,d).removeClass("ui-state-disabled");a(d).attr("aria-selected","true");!b.p.viewsortcols[0]&&b.p.lastsort!==e&&(a("span.s-ico",c).hide(),
a("span.s-ico",d).show())});a("#gview_"+a.jgrid.jqID(b.p.id)).append(b.grid.fbDiv);a(b.grid.bDiv).scroll(function(){a(b.grid.fbDiv).scrollTop(a(this).scrollTop())});!0===b.p.hoverrows&&a("#"+a.jgrid.jqID(b.p.id)).unbind("mouseover").unbind("mouseout");a(b).bind("jqGridAfterGridComplete.setFrozenColumns",function(){a("#"+a.jgrid.jqID(b.p.id)+"_frozen").remove();a(b.grid.fbDiv).height(a(b.grid.bDiv).height()-16);var c=a("#"+a.jgrid.jqID(b.p.id)).clone(!0);a("tr",c).each(function(){a("td:gt("+j+")",
this).remove()});a(c).width(1).attr("id",b.p.id+"_frozen");a(b.grid.fbDiv).append(c);!0===b.p.hoverrows&&(a("tr.jqgrow",c).hover(function(){a(this).addClass("ui-state-hover");a("#"+a.jgrid.jqID(this.id),"#"+a.jgrid.jqID(b.p.id)).addClass("ui-state-hover")},function(){a(this).removeClass("ui-state-hover");a("#"+a.jgrid.jqID(this.id),"#"+a.jgrid.jqID(b.p.id)).removeClass("ui-state-hover")}),a("tr.jqgrow","#"+a.jgrid.jqID(b.p.id)).hover(function(){a(this).addClass("ui-state-hover");a("#"+a.jgrid.jqID(this.id),
"#"+a.jgrid.jqID(b.p.id)+"_frozen").addClass("ui-state-hover")},function(){a(this).removeClass("ui-state-hover");a("#"+a.jgrid.jqID(this.id),"#"+a.jgrid.jqID(b.p.id)+"_frozen").removeClass("ui-state-hover")}));c=null});b.p.frozenColumns=!0}}}})},destroyFrozenColumns:function(){return this.each(function(){if(this.grid&&!0===this.p.frozenColumns){a(this.grid.fhDiv).remove();a(this.grid.fbDiv).remove();this.grid.fhDiv=null;this.grid.fbDiv=null;a(this).unbind(".setFrozenColumns");if(!0===this.p.hoverrows){var b;
a("#"+a.jgrid.jqID(this.p.id)).bind("mouseover",function(c){b=a(c.target).closest("tr.jqgrow");"ui-subgrid"!==a(b).attr("class")&&a(b).addClass("ui-state-hover")}).bind("mouseout",function(c){b=a(c.target).closest("tr.jqgrow");a(b).removeClass("ui-state-hover")})}this.p.frozenColumns=!1}})}})})(jQuery);
(function(c){c.jgrid.extend({jqGridImport:function(a){a=c.extend({imptype:"xml",impstring:"",impurl:"",mtype:"GET",impData:{},xmlGrid:{config:"roots>grid",data:"roots>rows"},jsonGrid:{config:"grid",data:"data"},ajaxOptions:{}},a||{});return this.each(function(){var d=this,f=function(a,b){var e=c(b.xmlGrid.config,a)[0],h=c(b.xmlGrid.data,a)[0],f,g;if(xmlJsonClass.xml2json&&c.jgrid.parse){e=xmlJsonClass.xml2json(e," ");e=c.jgrid.parse(e);for(g in e)e.hasOwnProperty(g)&&(f=e[g]);h?(h=e.grid.datatype,
e.grid.datatype="xmlstring",e.grid.datastr=a,c(d).jqGrid(f).jqGrid("setGridParam",{datatype:h})):c(d).jqGrid(f)}else alert("xml2json or parse are not present")},b=function(a,b){if(a&&"string"===typeof a){var e=!1;c.jgrid.useJSON&&(c.jgrid.useJSON=!1,e=!0);var f=c.jgrid.parse(a);e&&(c.jgrid.useJSON=!0);e=f[b.jsonGrid.config];if(f=f[b.jsonGrid.data]){var g=e.datatype;e.datatype="jsonstring";e.datastr=f;c(d).jqGrid(e).jqGrid("setGridParam",{datatype:g})}else c(d).jqGrid(e)}};switch(a.imptype){case "xml":c.ajax(c.extend({url:a.impurl,
type:a.mtype,data:a.impData,dataType:"xml",complete:function(b,g){"success"===g&&(f(b.responseXML,a),c(d).triggerHandler("jqGridImportComplete",[b,a]),c.isFunction(a.importComplete)&&a.importComplete(b))}},a.ajaxOptions));break;case "xmlstring":if(a.impstring&&"string"===typeof a.impstring){var g=c.parseXML(a.impstring);g&&(f(g,a),c(d).triggerHandler("jqGridImportComplete",[g,a]),c.isFunction(a.importComplete)&&a.importComplete(g),a.impstring=null);g=null}break;case "json":c.ajax(c.extend({url:a.impurl,
type:a.mtype,data:a.impData,dataType:"json",complete:function(f){try{b(f.responseText,a),c(d).triggerHandler("jqGridImportComplete",[f,a]),c.isFunction(a.importComplete)&&a.importComplete(f)}catch(g){}}},a.ajaxOptions));break;case "jsonstring":a.impstring&&"string"===typeof a.impstring&&(b(a.impstring,a),c(d).triggerHandler("jqGridImportComplete",[a.impstring,a]),c.isFunction(a.importComplete)&&a.importComplete(a.impstring),a.impstring=null)}})},jqGridExport:function(a){var a=c.extend({exptype:"xmlstring",
root:"grid",ident:"\t"},a||{}),d=null;this.each(function(){if(this.grid){var f,b=c.extend(!0,{},c(this).jqGrid("getGridParam"));b.rownumbers&&(b.colNames.splice(0,1),b.colModel.splice(0,1));b.multiselect&&(b.colNames.splice(0,1),b.colModel.splice(0,1));b.subGrid&&(b.colNames.splice(0,1),b.colModel.splice(0,1));b.knv=null;if(b.treeGrid)for(f in b.treeReader)b.treeReader.hasOwnProperty(f)&&(b.colNames.splice(b.colNames.length-1),b.colModel.splice(b.colModel.length-1));switch(a.exptype){case "xmlstring":d=
"<"+a.root+">"+xmlJsonClass.json2xml(b,a.ident)+"</"+a.root+">";break;case "jsonstring":d="{"+xmlJsonClass.toJson(b,a.root,a.ident,!1)+"}",void 0!==b.postData.filters&&(d=d.replace(/filters":"/,'filters":'),d=d.replace(/}]}"/,"}]}"))}}});return d},excelExport:function(a){a=c.extend({exptype:"remote",url:null,oper:"oper",tag:"excel",exportOptions:{}},a||{});return this.each(function(){if(this.grid){var d;"remote"===a.exptype&&(d=c.extend({},this.p.postData),d[a.oper]=a.tag,d=jQuery.param(d),d=-1!==
a.url.indexOf("?")?a.url+"&"+d:a.url+"?"+d,window.location=d)}})}})})(jQuery);
var xmlJsonClass={xml2json:function(a,b){9===a.nodeType&&(a=a.documentElement);var g=this.toJson(this.toObj(this.removeWhite(a)),a.nodeName,"\t");return"{\n"+b+(b?g.replace(/\t/g,b):g.replace(/\t|\n/g,""))+"\n}"},json2xml:function(a,b){var g=function(a,b,e){var d="",f,i;if(a instanceof Array)if(0===a.length)d+=e+"<"+b+">__EMPTY_ARRAY_</"+b+">\n";else{f=0;for(i=a.length;f<i;f+=1)var l=e+g(a[f],b,e+"\t")+"\n",d=d+l}else if("object"===typeof a){f=!1;d+=e+"<"+b;for(i in a)a.hasOwnProperty(i)&&("@"===
i.charAt(0)?d+=" "+i.substr(1)+'="'+a[i].toString()+'"':f=!0);d+=f?">":"/>";if(f){for(i in a)a.hasOwnProperty(i)&&("#text"===i?d+=a[i]:"#cdata"===i?d+="<![CDATA["+a[i]+"]]\>":"@"!==i.charAt(0)&&(d+=g(a[i],i,e+"\t")));d+=("\n"===d.charAt(d.length-1)?e:"")+"</"+b+">"}}else"function"===typeof a?d+=e+"<"+b+"><![CDATA["+a+"]]\></"+b+">":(void 0===a&&(a=""),d='""'===a.toString()||0===a.toString().length?d+(e+"<"+b+">__EMPTY_STRING_</"+b+">"):d+(e+"<"+b+">"+a.toString()+"</"+b+">"));return d},f="",e;for(e in a)a.hasOwnProperty(e)&&
(f+=g(a[e],e,""));return b?f.replace(/\t/g,b):f.replace(/\t|\n/g,"")},toObj:function(a){var b={},g=/function/i;if(1===a.nodeType){if(a.attributes.length){var f;for(f=0;f<a.attributes.length;f+=1)b["@"+a.attributes[f].nodeName]=(a.attributes[f].nodeValue||"").toString()}if(a.firstChild){var e=f=0,h=!1,c;for(c=a.firstChild;c;c=c.nextSibling)1===c.nodeType?h=!0:3===c.nodeType&&c.nodeValue.match(/[^ \f\n\r\t\v]/)?f+=1:4===c.nodeType&&(e+=1);if(h)if(2>f&&2>e){this.removeWhite(a);for(c=a.firstChild;c;c=
c.nextSibling)3===c.nodeType?b["#text"]=this.escape(c.nodeValue):4===c.nodeType?g.test(c.nodeValue)?b[c.nodeName]=[b[c.nodeName],c.nodeValue]:b["#cdata"]=this.escape(c.nodeValue):b[c.nodeName]?b[c.nodeName]instanceof Array?b[c.nodeName][b[c.nodeName].length]=this.toObj(c):b[c.nodeName]=[b[c.nodeName],this.toObj(c)]:b[c.nodeName]=this.toObj(c)}else a.attributes.length?b["#text"]=this.escape(this.innerXml(a)):b=this.escape(this.innerXml(a));else if(f)a.attributes.length?b["#text"]=this.escape(this.innerXml(a)):
(b=this.escape(this.innerXml(a)),"__EMPTY_ARRAY_"===b?b="[]":"__EMPTY_STRING_"===b&&(b=""));else if(e)if(1<e)b=this.escape(this.innerXml(a));else for(c=a.firstChild;c;c=c.nextSibling)if(g.test(a.firstChild.nodeValue)){b=a.firstChild.nodeValue;break}else b["#cdata"]=this.escape(c.nodeValue)}!a.attributes.length&&!a.firstChild&&(b=null)}else 9===a.nodeType?b=this.toObj(a.documentElement):alert("unhandled node type: "+a.nodeType);return b},toJson:function(a,b,g,f){void 0===f&&(f=!0);var e=b?'"'+b+'"':
"",h="\t",c="\n";f||(c=h="");if("[]"===a)e+=b?":[]":"[]";else if(a instanceof Array){var j,d,k=[];d=0;for(j=a.length;d<j;d+=1)k[d]=this.toJson(a[d],"",g+h,f);e+=(b?":[":"[")+(1<k.length?c+g+h+k.join(","+c+g+h)+c+g:k.join(""))+"]"}else if(null===a)e+=(b&&":")+"null";else if("object"===typeof a){j=[];for(d in a)a.hasOwnProperty(d)&&(j[j.length]=this.toJson(a[d],d,g+h,f));e+=(b?":{":"{")+(1<j.length?c+g+h+j.join(","+c+g+h)+c+g:j.join(""))+"}"}else e="string"===typeof a?e+((b&&":")+'"'+a.replace(/\\/g,
"\\\\").replace(/\"/g,'\\"')+'"'):e+((b&&":")+a.toString());return e},innerXml:function(a){var b="";if("innerHTML"in a)b=a.innerHTML;else for(var g=function(a){var b="",h;if(1===a.nodeType){b+="<"+a.nodeName;for(h=0;h<a.attributes.length;h+=1)b+=" "+a.attributes[h].nodeName+'="'+(a.attributes[h].nodeValue||"").toString()+'"';if(a.firstChild){b+=">";for(h=a.firstChild;h;h=h.nextSibling)b+=g(h);b+="</"+a.nodeName+">"}else b+="/>"}else 3===a.nodeType?b+=a.nodeValue:4===a.nodeType&&(b+="<![CDATA["+a.nodeValue+
"]]\>");return b},a=a.firstChild;a;a=a.nextSibling)b+=g(a);return b},escape:function(a){return a.replace(/[\\]/g,"\\\\").replace(/[\"]/g,'\\"').replace(/[\n]/g,"\\n").replace(/[\r]/g,"\\r")},removeWhite:function(a){a.normalize();var b;for(b=a.firstChild;b;)if(3===b.nodeType)if(b.nodeValue.match(/[^ \f\n\r\t\v]/))b=b.nextSibling;else{var g=b.nextSibling;a.removeChild(b);b=g}else 1===b.nodeType&&this.removeWhite(b),b=b.nextSibling;return a}};
function tableToGrid(j,k){jQuery(j).each(function(){if(!this.grid){jQuery(this).width("99%");var b=jQuery(this).width(),c=jQuery("tr td:first-child input[type=checkbox]:first",jQuery(this)),a=jQuery("tr td:first-child input[type=radio]:first",jQuery(this)),c=0<c.length,a=!c&&0<a.length,i=c||a,d=[],e=[];jQuery("th",jQuery(this)).each(function(){0===d.length&&i?(d.push({name:"__selection__",index:"__selection__",width:0,hidden:!0}),e.push("__selection__")):(d.push({name:jQuery(this).attr("id")||jQuery.trim(jQuery.jgrid.stripHtml(jQuery(this).html())).split(" ").join("_"),
index:jQuery(this).attr("id")||jQuery.trim(jQuery.jgrid.stripHtml(jQuery(this).html())).split(" ").join("_"),width:jQuery(this).width()||150}),e.push(jQuery(this).html()))});var f=[],g=[],h=[];jQuery("tbody > tr",jQuery(this)).each(function(){var b={},a=0;jQuery("td",jQuery(this)).each(function(){if(0===a&&i){var c=jQuery("input",jQuery(this)),e=c.attr("value");g.push(e||f.length);c.is(":checked")&&h.push(e);b[d[a].name]=c.attr("value")}else b[d[a].name]=jQuery(this).html();a++});0<a&&f.push(b)});
jQuery(this).empty();jQuery(this).addClass("scroll");jQuery(this).jqGrid(jQuery.extend({datatype:"local",width:b,colNames:e,colModel:d,multiselect:c},k||{}));for(b=0;b<f.length;b++)a=null,0<g.length&&(a=g[b])&&a.replace&&(a=encodeURIComponent(a).replace(/[.\-%]/g,"_")),null===a&&(a=b+1),jQuery(this).jqGrid("addRowData",a,f[b]);for(b=0;b<h.length;b++)jQuery(this).jqGrid("setSelection",h[b])}})};
(function(b){b.jgrid.msie&&8===b.jgrid.msiever()&&(b.expr[":"].hidden=function(b){return 0===b.offsetWidth||0===b.offsetHeight||"none"===b.style.display});b.jgrid._multiselect=!1;if(b.ui&&b.ui.multiselect){if(b.ui.multiselect.prototype._setSelected){var o=b.ui.multiselect.prototype._setSelected;b.ui.multiselect.prototype._setSelected=function(a,d){var c=o.call(this,a,d);if(d&&this.selectedList){var e=this.element;this.selectedList.find("li").each(function(){b(this).data("optionLink")&&b(this).data("optionLink").remove().appendTo(e)})}return c}}b.ui.multiselect.prototype.destroy&&
(b.ui.multiselect.prototype.destroy=function(){this.element.show();this.container.remove();b.Widget===void 0?b.widget.prototype.destroy.apply(this,arguments):b.Widget.prototype.destroy.apply(this,arguments)});b.jgrid._multiselect=!0}b.jgrid.extend({sortableColumns:function(a){return this.each(function(){function d(){c.p.disableClick=true}var c=this,e=b.jgrid.jqID(c.p.id),e={tolerance:"pointer",axis:"x",scrollSensitivity:"1",items:">th:not(:has(#jqgh_"+e+"_cb,#jqgh_"+e+"_rn,#jqgh_"+e+"_subgrid),:hidden)",
placeholder:{element:function(a){return b(document.createElement(a[0].nodeName)).addClass(a[0].className+" ui-sortable-placeholder ui-state-highlight").removeClass("ui-sortable-helper")[0]},update:function(b,a){a.height(b.currentItem.innerHeight()-parseInt(b.currentItem.css("paddingTop")||0,10)-parseInt(b.currentItem.css("paddingBottom")||0,10));a.width(b.currentItem.innerWidth()-parseInt(b.currentItem.css("paddingLeft")||0,10)-parseInt(b.currentItem.css("paddingRight")||0,10))}},update:function(a,
e){var d=b(e.item).parent(),d=b(">th",d),f={},g=c.p.id+"_";b.each(c.p.colModel,function(b){f[this.name]=b});var j=[];d.each(function(){var a=b(">div",this).get(0).id.replace(/^jqgh_/,"").replace(g,"");f.hasOwnProperty(a)&&j.push(f[a])});b(c).jqGrid("remapColumns",j,true,true);b.isFunction(c.p.sortable.update)&&c.p.sortable.update(j);setTimeout(function(){c.p.disableClick=false},50)}};if(c.p.sortable.options)b.extend(e,c.p.sortable.options);else if(b.isFunction(c.p.sortable))c.p.sortable={update:c.p.sortable};
if(e.start){var g=e.start;e.start=function(b,a){d();g.call(this,b,a)}}else e.start=d;if(c.p.sortable.exclude)e.items=e.items+(":not("+c.p.sortable.exclude+")");a.sortable(e).data("sortable").floating=true})},columnChooser:function(a){function d(a,c){a&&(typeof a==="string"?b.fn[a]&&b.fn[a].apply(c,b.makeArray(arguments).slice(2)):b.isFunction(a)&&a.apply(c,b.makeArray(arguments).slice(2)))}var c=this;if(!b("#colchooser_"+b.jgrid.jqID(c[0].p.id)).length){var e=b('<div id="colchooser_'+c[0].p.id+'" style="position:relative;overflow:hidden"><div><select multiple="multiple"></select></div></div>'),
g=b("select",e),a=b.extend({width:420,height:240,classname:null,done:function(b){b&&c.jqGrid("remapColumns",b,true)},msel:"multiselect",dlog:"dialog",dialog_opts:{minWidth:470},dlog_opts:function(a){var c={};c[a.bSubmit]=function(){a.apply_perm();a.cleanup(false)};c[a.bCancel]=function(){a.cleanup(true)};return b.extend(true,{buttons:c,close:function(){a.cleanup(true)},modal:a.modal||false,resizable:a.resizable||true,width:a.width+20},a.dialog_opts||{})},apply_perm:function(){b("option",g).each(function(){this.selected?
c.jqGrid("showCol",i[this.value].name):c.jqGrid("hideCol",i[this.value].name)});var e=[];b("option:selected",g).each(function(){e.push(parseInt(this.value,10))});b.each(e,function(){delete m[i[parseInt(this,10)].name]});b.each(m,function(){var b=parseInt(this,10);var a=e,c=b;if(c>=0){var d=a.slice(),i=d.splice(c,Math.max(a.length-c,c));if(c>a.length)c=a.length;d[c]=b;e=d.concat(i)}else e=void 0});a.done&&a.done.call(c,e)},cleanup:function(b){d(a.dlog,e,"destroy");d(a.msel,g,"destroy");e.remove();
b&&a.done&&a.done.call(c)},msel_opts:{}},b.jgrid.col,a||{});if(b.ui&&b.ui.multiselect&&a.msel==="multiselect"){if(!b.jgrid._multiselect){alert("Multiselect plugin loaded after jqGrid. Please load the plugin before the jqGrid!");return}a.msel_opts=b.extend(b.ui.multiselect.defaults,a.msel_opts)}a.caption&&e.attr("title",a.caption);if(a.classname){e.addClass(a.classname);g.addClass(a.classname)}if(a.width){b(">div",e).css({width:a.width,margin:"0 auto"});g.css("width",a.width)}if(a.height){b(">div",
e).css("height",a.height);g.css("height",a.height-10)}var i=c.jqGrid("getGridParam","colModel"),q=c.jqGrid("getGridParam","colNames"),m={},f=[];g.empty();b.each(i,function(a){m[this.name]=a;this.hidedlg?this.hidden||f.push(a):g.append("<option value='"+a+"' "+(this.hidden?"":"selected='selected'")+">"+b.jgrid.stripHtml(q[a])+"</option>")});var n=b.isFunction(a.dlog_opts)?a.dlog_opts.call(c,a):a.dlog_opts;d(a.dlog,e,n);n=b.isFunction(a.msel_opts)?a.msel_opts.call(c,a):a.msel_opts;d(a.msel,g,n)}},sortableRows:function(a){return this.each(function(){var d=
this;if(d.grid&&!d.p.treeGrid&&b.fn.sortable){a=b.extend({cursor:"move",axis:"y",items:".jqgrow"},a||{});if(a.start&&b.isFunction(a.start)){a._start_=a.start;delete a.start}else a._start_=false;if(a.update&&b.isFunction(a.update)){a._update_=a.update;delete a.update}else a._update_=false;a.start=function(c,e){b(e.item).css("border-width","0px");b("td",e.item).each(function(b){this.style.width=d.grid.cols[b].style.width});if(d.p.subGrid){var g=b(e.item).attr("id");try{b(d).jqGrid("collapseSubGridRow",
g)}catch(i){}}a._start_&&a._start_.apply(this,[c,e])};a.update=function(c,e){b(e.item).css("border-width","");d.p.rownumbers===true&&b("td.jqgrid-rownum",d.rows).each(function(a){b(this).html(a+1+(parseInt(d.p.page,10)-1)*parseInt(d.p.rowNum,10))});a._update_&&a._update_.apply(this,[c,e])};b("tbody:first",d).sortable(a);b("tbody:first",d).disableSelection()}})},gridDnD:function(a){return this.each(function(){function d(){var a=b.data(c,"dnd");b("tr.jqgrow:not(.ui-draggable)",c).draggable(b.isFunction(a.drag)?
a.drag.call(b(c),a):a.drag)}var c=this,e,g;if(c.grid&&!c.p.treeGrid&&b.fn.draggable&&b.fn.droppable){b("#jqgrid_dnd")[0]===void 0&&b("body").append("<table id='jqgrid_dnd' class='ui-jqgrid-dnd'></table>");if(typeof a==="string"&&a==="updateDnD"&&c.p.jqgdnd===true)d();else{a=b.extend({drag:function(a){return b.extend({start:function(e,d){var f;if(c.p.subGrid){f=b(d.helper).attr("id");try{b(c).jqGrid("collapseSubGridRow",f)}catch(g){}}for(f=0;f<b.data(c,"dnd").connectWith.length;f++)b(b.data(c,"dnd").connectWith[f]).jqGrid("getGridParam",
"reccount")===0&&b(b.data(c,"dnd").connectWith[f]).jqGrid("addRowData","jqg_empty_row",{});d.helper.addClass("ui-state-highlight");b("td",d.helper).each(function(b){this.style.width=c.grid.headers[b].width+"px"});a.onstart&&b.isFunction(a.onstart)&&a.onstart.call(b(c),e,d)},stop:function(e,d){var f;if(d.helper.dropped&&!a.dragcopy){f=b(d.helper).attr("id");f===void 0&&(f=b(this).attr("id"));b(c).jqGrid("delRowData",f)}for(f=0;f<b.data(c,"dnd").connectWith.length;f++)b(b.data(c,"dnd").connectWith[f]).jqGrid("delRowData",
"jqg_empty_row");a.onstop&&b.isFunction(a.onstop)&&a.onstop.call(b(c),e,d)}},a.drag_opts||{})},drop:function(a){return b.extend({accept:function(a){if(!b(a).hasClass("jqgrow"))return a;a=b(a).closest("table.ui-jqgrid-btable");if(a.length>0&&b.data(a[0],"dnd")!==void 0){a=b.data(a[0],"dnd").connectWith;return b.inArray("#"+b.jgrid.jqID(this.id),a)!==-1?true:false}return false},drop:function(e,d){if(b(d.draggable).hasClass("jqgrow")){var f=b(d.draggable).attr("id"),f=d.draggable.parent().parent().jqGrid("getRowData",
f);if(!a.dropbyname){var g=0,j={},h,l,p=b("#"+b.jgrid.jqID(this.id)).jqGrid("getGridParam","colModel");try{for(l in f)if(f.hasOwnProperty(l)){h=p[g].name;h==="cb"||h==="rn"||h==="subgrid"||f.hasOwnProperty(l)&&p[g]&&(j[h]=f[l]);g++}f=j}catch(o){}}d.helper.dropped=true;if(a.beforedrop&&b.isFunction(a.beforedrop)){h=a.beforedrop.call(this,e,d,f,b("#"+b.jgrid.jqID(c.p.id)),b(this));h!==void 0&&h!==null&&typeof h==="object"&&(f=h)}if(d.helper.dropped){var k;if(a.autoid)if(b.isFunction(a.autoid))k=a.autoid.call(this,
f);else{k=Math.ceil(Math.random()*1E3);k=a.autoidprefix+k}b("#"+b.jgrid.jqID(this.id)).jqGrid("addRowData",k,f,a.droppos)}a.ondrop&&b.isFunction(a.ondrop)&&a.ondrop.call(this,e,d,f)}}},a.drop_opts||{})},onstart:null,onstop:null,beforedrop:null,ondrop:null,drop_opts:{activeClass:"ui-state-active",hoverClass:"ui-state-hover"},drag_opts:{revert:"invalid",helper:"clone",cursor:"move",appendTo:"#jqgrid_dnd",zIndex:5E3},dragcopy:false,dropbyname:false,droppos:"first",autoid:true,autoidprefix:"dnd_"},a||
{});if(a.connectWith){a.connectWith=a.connectWith.split(",");a.connectWith=b.map(a.connectWith,function(a){return b.trim(a)});b.data(c,"dnd",a);c.p.reccount!==0&&!c.p.jqgdnd&&d();c.p.jqgdnd=true;for(e=0;e<a.connectWith.length;e++){g=a.connectWith[e];b(g).droppable(b.isFunction(a.drop)?a.drop.call(b(c),a):a.drop)}}}}})},gridResize:function(a){return this.each(function(){var d=this,c=b.jgrid.jqID(d.p.id);if(d.grid&&b.fn.resizable){a=b.extend({},a||{});if(a.alsoResize){a._alsoResize_=a.alsoResize;delete a.alsoResize}else a._alsoResize_=
false;if(a.stop&&b.isFunction(a.stop)){a._stop_=a.stop;delete a.stop}else a._stop_=false;a.stop=function(e,g){b(d).jqGrid("setGridParam",{height:b("#gview_"+c+" .ui-jqgrid-bdiv").height()});b(d).jqGrid("setGridWidth",g.size.width,a.shrinkToFit);a._stop_&&a._stop_.call(d,e,g)};a.alsoResize=a._alsoResize_?eval("("+("{'#gview_"+c+" .ui-jqgrid-bdiv':true,'"+a._alsoResize_+"':true}")+")"):b(".ui-jqgrid-bdiv","#gview_"+c);delete a._alsoResize_;b("#gbox_"+c).resizable(a)}})}})})(jQuery);
