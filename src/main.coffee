
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/DEMOS/TABULATE'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
# test                      = require '../../../apps/guy-test'
# PATH                      = require 'path'
types                     = new ( require 'intertype' ).Intertype
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
# { to_width }              = require 'to-width'
# on_process_exit           = require 'exit-hook'
# sleep                     = ( dts ) -> new Promise ( done ) => setTimeout done, dts * 1000
SQL                       = String.raw
TXT                       = require 'intertext'
{ width_of }              = require 'to-width'
{ lets
  freeze }                = require 'letsfreezethat'
SP                        = require 'steampipes'
{ $
  $watch
  $drain }                = SP.export()
guy                       = require 'guy'


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
types.declare 'sql_limit', ( x ) ->
  return true if @isa.nonempty_text x
  return true if @isa.cardinal x
  return false

#-----------------------------------------------------------------------------------------------------------
types.declare 'dbatbl_walk_relation_lines_cfg', tests:
  "@isa.object x":                    ( x ) -> @isa.object x
  "@isa.sql_limit x.limit":           ( x ) -> @isa.sql_limit x.limit

#-----------------------------------------------------------------------------------------------------------
defaults =
  dbatbl_walk_relation_lines_cfg:
    limit:      10
    order_by:   'random'

#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class @Dbatbl

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    # validate.dbv_constructor_cfg @cfg = { types.defaults.dbv_constructor_cfg..., cfg..., }
    @cfg = cfg
    #.......................................................................................................
    guy.props.def @, 'dba', { enumerable: false, value: cfg.dba, }
    delete @cfg.dba
    @cfg      = freeze @cfg
    @tabulate = guy.nowait.for_awaitable @tabulate_async
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _estimate_column_widths: ( query ) ->
    preview_line_count  = 10 ### TAINT make configurable ###
    line_count          = 0
    R                   =
      leading_rows: []
      widths:       []
    for row from query
      line_count++
      R.leading_rows.push row
      for k, idx in Object.keys row
        R.widths[ idx ] = Math.max ( R.widths[ idx ] ? 0 ), width_of rpr k
        R.widths[ idx ] = Math.max ( R.widths[ idx ] ? 0 ), width_of rpr row[ k ]
      # break if line_count >= preview_line_count
    return R

  #---------------------------------------------------------------------------------------------------------
  ### TAINT use `cfg` ###
  tabulate_async: ( query ) => new Promise ( resolve, reject ) =>
    ### TAINT cfg option: echo as-you-go ###
    ### TAINT cfg option: return list of lines ###
    ### TAINT cfg option: start with newline ###
    { leading_rows
      widths  } = @_estimate_column_widths query
    #.....................................................................................................
    source      = SP.new_push_source()
    pipeline    = []
    pipeline.push source
    # pipeline.push $watch ( d ) -> echo d
    pipeline.push $ ( d, send ) =>
      # debug '^76^', d
      for k, v of d
        switch type = type_of v
          when 'text' then  d[ k ] = CND.blue v
          else              d[ k ] = CND.white rpr v
      send d
    pipeline.push TXT.TBL.$tabulate { multiline: false, widths, }
    pipeline.push $ ( d, send ) -> send d.text
    pipeline.push $drain ( result ) -> resolve result.join '\n'
    SP.pull pipeline...
    #.....................................................................................................
    source.send row for row in leading_rows
    source.send row for row from query
    source.end()
    return null

  #---------------------------------------------------------------------------------------------------------
  ### TAINT use `cfg` ###
  walk_relation_lines: ( name ) ->
    ### TAINT add support for schemas ###
    name_i          = @dba.sql.I name
    sample_row      = @dba.first_row @dba.query SQL"select * from #{name_i} limit 1"
    col_names       = Object.keys sample_row
    order_by        = [ 1 .. col_names.length ].join ', '
    order_by        = 'random()'
    limit           = 10
    type            = @dba.first_value @dba.query SQL"select type from sqlite_schema where name = $name;", { name, }
    query           = @dba.query SQL"select * from #{name_i} order by #{order_by} limit #{limit};"
    row_count       = @dba.first_value @dba.query SQL"select count(*) from #{name_i};"
    yield "\n"
    if row_count > limit then yield "#{type} #{name_i} (#{row_count} rows; first #{limit} shown)"
    else                      yield "#{type} #{name_i} (all #{row_count} rows)"
    yield @tabulate query
    return null


############################################################################################################
if module is require.main then do =>







