
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
# TXT                       = require 'intertext'
TBL                       = require './intertext-tabulate'
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
  return true unless x?
  return true if @isa.nonempty_text x
  return true if @isa.cardinal x
  return false

#-----------------------------------------------------------------------------------------------------------
types.declare 'dbatbl_walk_relation_lines_cfg', tests:
  "@isa.object x":                  ( x ) -> @isa.object x
  "@isa.sql_limit x.limit":         ( x ) -> @isa.sql_limit x.limit
  "@isa.nonempty_text x.order_by":  ( x ) -> @isa.nonempty_text x.order_by
  "@isa.nonempty_text x.schema":    ( x ) -> @isa.nonempty_text x.schema
  "@isa.nonempty_text x.name":      ( x ) -> @isa.nonempty_text x.name

#-----------------------------------------------------------------------------------------------------------
types.defaults =
  dbatbl_walk_relation_lines_cfg:
    limit:      10
    order_by:   'random()'
    schema:     'main'
    name:       null


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class @Tbl

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    # validate.dbv_constructor_cfg @cfg = { types.defaults.dbv_constructor_cfg..., cfg..., }
    @cfg = cfg
    #.......................................................................................................
    guy.props.def @, 'dba', { enumerable: false, value: cfg.dba, }
    delete @cfg.dba
    @cfg      = freeze @cfg
    # @tabulate = guy.nowait.for_awaitable @tabulate_async
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
  _tabulate: ( query ) =>
    ### TAINT cfg option: echo as-you-go ###
    ### TAINT cfg option: return list of lines ###
    ### TAINT cfg option: start with newline ###
    R           = null
    { leading_rows
      widths  } = @_estimate_column_widths query
    #.....................................................................................................
    source      = SP.new_push_source()
    pipeline    = []
    pipeline.push source
    pipeline.push TBL.$tabulate { multiline: false, widths, }
    pipeline.push $ ( d, send ) -> send d.text
    pipeline.push $drain ( result ) -> R = result.join '\n'
    SP.pull pipeline...
    #.....................................................................................................
    source.send row for row in leading_rows
    source.send row for row from query
    source.end()
    return R

  #---------------------------------------------------------------------------------------------------------
  ### TAINT use `cfg` ###
  walk_relation_lines: ( cfg ) ->
    ### TAINT add support for schemas ###
    validate.dbatbl_walk_relation_lines_cfg cfg = { types.defaults.dbatbl_walk_relation_lines_cfg..., cfg..., }
    { schema
      name
      order_by
      limit }       = cfg
    schema_i        = @dba.sql.I schema
    qname_i         = schema_i + '.' + @dba.sql.I name
    limit           = if cfg.limit is null then 1e9 else cfg.limit
    #.......................................................................................................
    type        = @dba.type_of { schema, name, }
    try
      field_names = @dba.field_names_of { schema, name, }
    catch error
      error_name = error.name ? error.code ? 'error'
      yield ( CND.red CND.reverse ' X ' ) + ( CND.steel " #{error_name}: #{error.message}" )
      return null
    #.......................................................................................................
    ### get row count ###
    ### TAINT implement in `Dba` ###
    row_count       = @dba.first_value @dba.query SQL"select count(*) from #{qname_i};"
    #.......................................................................................................
    # yield "\n"
    if row_count is 0
      yield ( CND.yellow CND.reverse ' 0 ' ) + ( CND.steel " no rows in #{type} #{qname_i}" )
      yield field_names.join ', '
      return null
    #.......................................................................................................
    ### dump data ###
    ### TAINT implement in `Dba` ###
    #.......................................................................................................
    query = @dba.query SQL"select * from #{qname_i} order by #{order_by} limit #{limit};"
    if row_count > limit
      yield ( CND.green CND.reverse " #{row_count} " ) + CND.steel " #{type} #{qname_i} (#{row_count} rows; first #{limit} shown)"
    else
      yield ( CND.green CND.reverse " #{row_count} " ) + CND.steel " #{type} #{qname_i} (all #{row_count} rows)"
    yield @_tabulate query
    return null


############################################################################################################
if module is require.main then do =>







