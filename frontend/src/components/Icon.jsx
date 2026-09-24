// Material Symbols Outlined helper.
export default function Icon({ name, className = '', fill = false, style }) {
  return (
    <span className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`} style={style}>
      {name}
    </span>
  )
}
